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

## Bottom line

- Value-schema swap: structurally sound, loses field-level error diagnostics, needs a translator to be worth it.
- Reference-validation swap: `validate()` covers most "is this reference even valid" checks in one call but misses cycles; the "assemble everything" lint step the app needs is new code we write regardless of what it's layered on.
- The resolver/modes (`mergeDocuments`/`parseResolver`/`resolve`) surface is the part of the library that most directly duplicates real hand-rolled code in this repo today, and is the strongest candidate for a follow-up spike if this refactor continues.
