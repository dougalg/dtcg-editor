# Spike: replacing token-core with @styleframe/dtcg

Exploratory only — not a decision record, no code from this spike is meant to merge as-is. Two passes:

1. Swap `token-core`'s per-value structural schemas (color, dimension) to delegate to the library.
2. Swap `token-core`/`web-app`'s reference/alias validation to the library's whole-document `validate()`/`resolveAliases()`, to see how much of the hand-rolled reference-checking machinery (`reference-index.ts`, `resolve-reference.ts`, `reference.ts`, `ReferenceWarning`, `ReferenceDefinitionPicker`) it could replace.

`@styleframe/dtcg@1.1.0` (MIT, styleframe-dev) implements the DTCG 2025.10 Format/Color/Resolver modules: `parse`, `validate`, `applyInheritance`, `resolveAliases`, `mergeDocuments`, `parseResolver`/`resolve`, plus per-type guards and color-space conversion via `culori`.

## Pass 1 — value schemas (color, dimension)

Commit `e5464e4` swapped `ColorValueSchema`/`DimensionValueSchema` to wrap the library's `isColorValue`/`isDimensionValue` guards in `z.custom()`.

- All 25 existing color/dimension unit tests pass. Structural parity holds, including this app's two deliberate spec deviations (legacy bare-hex `$value`, `px`/`rem`-only units) — those still had to stay hand-rolled since the library doesn't model either.
- **4 tests fail** in `token-editor-color` and `web-app`: the library's guards are boolean predicates with no field-level diagnostics. Our old `z.object`/`z.tuple` schema gave `ColorValidationErrorHandler` per-field messages (`"colorSpace: ..."`, `"components: ..."`) for free; `z.custom(guard)` collapses every failure into one generic `"Invalid input"` with no path.
- Verdict: structural match, but not a diagnostics-preserving drop-in. Reproducing per-field messages means writing a guard-failure→Zod-issue translator ourselves.

## Pass 2 — reference/alias validation

Ran `@styleframe/dtcg`'s `parse`/`validate`/`applyInheritance`/`resolveAliases`/`mergeDocuments` against the real `apps/web-app/e2e/fixtures/token-references/` fixture set (the ones spec-007 built specifically to exercise missing targets, group targets, circular chains, and unparseable-sibling-file isolation), merged in the same order as `tokens.resolver.json`'s `base` set.

**`validate(mergedDoc)`** — one call, returns every structural/alias problem across the whole merged document in one pass:

```
[color.broken.missing-target] Alias "{color.nope.not.real}" does not resolve to any token
[color.broken.group-target]   Alias "{color.group-container}" does not resolve to any token
[color.into-broken-file]      Alias "{color.broken-syntax.would-have-been-here}" does not resolve to any token
```

This matches most of what `reference-index.ts` + `ReferenceWarning` currently detect by hand — missing-target and group-target (referencing a group, not a token, which is invalid per spec) both surface with a dot-path. Good candidate for the "does this reference even resolve" structural check.

**But it never reports the circular pair** (`color.circular.a ⇄ color.circular.b`) at all — cycles are silently absent from `validate()`'s output.

**`resolveAliases(doc, { strict })`** does detect cycles (throws `CircularReferenceError` with the full cycle path) — but it throws and aborts the *entire* resolution on the **first** problem it hits, cycle or (in strict mode) unknown target, and there's no way to ask it to keep going and collect the rest. Running it on the merged fixture doc (which has both a missing-target and a cycle) throws on the missing-target in strict mode, or throws on the cycle in non-strict mode — never returns "here are all N problems."

## What this means for the "lint pipeline" idea

The instinct to add a lint step that walks the tree and assembles a full diagnostics list (rather than validate-until-first-failure) is right, and is **not something the library hands us for free** — it gives good primitives (`validate()` for one-shot structural/target-existence checks, `resolveAliases()` for computing a resolved value along a chain, `CircularReferenceError` carrying a cycle path when you catch it), but no "collect every diagnostic across the document" entry point. That collection loop is code we'd write regardless of whether the underlying checks come from the library or stay hand-rolled — it isn't a reason on its own to adopt the library.

Concretely, a lint step built on the library would still need to, per token:
1. Take `validate()`'s output for the cheap, already-batched structural/target-existence errors.
2. Separately walk each token's alias chain itself (or call `resolveAliases` seeded at that one token) inside its own try/catch, to catch `CircularReferenceError` per starting point — since the document-wide call stops at the first cycle it finds anywhere.

That second part is close to what `resolve-reference.ts`'s existing chain-walking already does today. So adopting the library here wouldn't eliminate that module, just change what feeds its structural pre-check.

## Where real overlap looks strongest

Not the reference-checking *diagnostics* loop (that's ours to write either way), but the **resolver/modes machinery**: `mergeDocuments`, `parseResolver`, and `resolve()` (sets + modifiers + resolution order, spec §Resolver Module) map closely onto this app's hand-rolled `resolver-file.ts` (154 lines) and the mode-handling half of `reference-index.ts`. That's a more promising area to prototype next than either the value schemas or the diagnostics loop, if this refactor is pursued further.

## Pass 3 — resolver/modes machinery (`mergeDocuments`/`parseResolver`/`resolveResolver`)

This app's `resolver-file.ts` + the mode-handling half of `reference-index.ts` hand-roll exactly what the library's resolver module is for: composing `sets` and `modifier` contexts into a final per-mode document. Tried swapping in `parseResolver`/`resolveResolver` (the package's exported name for `resolve`) against the real `tokens.resolver.json` fixture (a `type: "modifier"` entry declared **inline** in `resolutionOrder`, matching the DTCG spec's own example shape and this repo's convention) plus a synthetic pair testing merge semantics.

- **Merge semantics agree with ours**: when a later source in a set redefines a path that an earlier source also defines, the later source's token wins *wholly* — fields not repeated (e.g. `$description`) are not carried forward from the earlier definition. Same "whole occurrence replaces" behavior `reference-index.ts`'s `buildDefinitionsForPath` already implements. No compatibility gap here.
- **A real bug**: resolving with an inline `{type: "modifier", name: "mode", ...}` entry in `resolutionOrder` (rather than a top-level `modifiers` map referenced via `{"$ref": "#/modifiers/mode"}`) throws `ValidationError: Unknown modifier "mode"` even though `inputs` correctly names it. Traced it into the bundled `dist/index.js`: `resolveResolutionItem` only attaches `name` to the item it returns when the entry came in via `$ref` — the plain-inline branch (`return { kind: "modifier", value: item }`) drops `item.name` entirely, so `validateInputs` never registers it as declared and rejects any input for it. Reproduced with the exact fixture as authored; restructuring to the `$ref`-indirection form sidesteps it, but that's a real interop gap against the DTCG spec's own inline-modifier example and against this repo's existing resolver files.
- **`resolveResolver()` inherits `resolveAliases`' abort-on-first-cycle behavior, whole-document**: running it against the fixture set (which deliberately includes `circular.tokens.json` in its `base` set, since that's how spec-007 exercises the app's own graceful-degradation UI) throws `CircularReferenceError` and returns nothing at all — not just for the circular token, for the *entire resolved document*. This app's requirement (spec-007) is the opposite: one broken/circular token must not stop every other token in the tree from rendering. `resolve()` as shipped can't be used directly to compute "the app's actual live values," only as an all-or-nothing batch check.

## Should we fork the library and patch `resolveAliases`/`resolve` to not throw?

Worth addressing directly, since it's the natural next idea given the abort-on-first-error behavior above.

**The functions that would need patching aren't public API.** `resolveValue`, `resolveTreeInPlace`, `applySet`, `applyModifier`, and `resolveResolutionItem` (where the inline-modifier bug lives) are internal to the bundled, minified `dist/index.js` — not exported, no `.d.ts`, no stable contract. The npm package ships only compiled output, not the TypeScript source (confirmed from the tarball contents: `README.md`, `CHANGELOG.md`, `package.json`, `dist/*` — no `src/`). A real fork would mean cloning `github.com/styleframe-dev/styleframe` (its actual source repo) rather than patching `node_modules`, then maintaining that fork against upstream — re-diffing internal, non-exported logic on every version bump, with no semver contract protecting us from it moving underneath the patch.

**A lower-risk path gets the same outcome without forking anything**: build the "collect every diagnostic, don't abort" traversal ourselves on top of the library's *actually-exported*, stable primitives — `validate()` for one-shot structural/target-existence checks, plus `isAlias`/`parseAlias`/`lookupToken`/`splitPath`/`joinPath` to do our own per-token chain walk with cycle detection (catching `CircularReferenceError` per starting token rather than per document). This is close to what `resolve-reference.ts` already does today, and Pass 2's conclusion already established that this walk is code we have to own regardless of what it's layered on. The resolver/modes composition (`mergeDocuments`/set-and-modifier merging) could still be adopted for the *set/context composition* half — that part doesn't need the throwing `resolve()` wrapper at all, since `mergeDocuments` alone is a pure, non-throwing, exported function; only the convenience `resolve()` entry point (which calls `resolveAliases` internally with no way to opt out) has the abort-on-cycle problem.

So: skip forking. Use `mergeDocuments` directly for set/context composition (once the inline-modifier bug is either worked around by restructuring our resolver files to the `$ref` form, or reported upstream), and keep our own resolve-reference.ts-style chain walker — built on the library's exported guards/lookups instead of hand-rolled ones — for the part that has to survive a broken token without aborting everything else.

## Bottom line

- Value-schema swap: structurally sound, loses field-level error diagnostics, needs a translator to be worth it.
- Reference-validation swap: `validate()` covers most "is this reference even valid" checks in one call but misses cycles; the "assemble everything" lint step the app needs is new code we write regardless of what it's layered on.
- Resolver/modes swap: merge semantics genuinely match ours (no compatibility surprise), but the convenience `resolve()` entry point has a real bug against inline modifiers and aborts the whole document on any single cycle — not usable as-is for computing live app values. `mergeDocuments` alone (exported, non-throwing) is still a solid candidate; the throwing `resolve()`/`resolveAliases` wrapper is not, and isn't worth forking to fix — that traversal is better owned by us on top of the library's exported primitives, same conclusion as Pass 2.
- Net: this library is a legitimate source for spec-conformant *parsing, guards, and set/modifier composition* across all 14 token types (real leverage for the 11 backlog types this app doesn't support yet), but the app's own diagnostics-collecting and graceful-degradation behavior (survive one broken token, report everything, never abort-all) has to stay hand-written regardless of adoption — that's this app's actual differentiator, not something to source from the library.
