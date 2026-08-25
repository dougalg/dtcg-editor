# `@dtcg-editor/token-core`

Parsing, typing, and value validation for [DTCG](https://www.designtokens.org/tr/2025.10/format/) (Design Tokens Community Group) token documents — every token type's schema and shape logic lives here, once, so every consumer (this repo's editor UI, a future CLI, a server-side validator) shares one spec-conformant source of truth.

This package is completely UI/framework-agnostic: no React import, no knowledge of which (if any) editor renders a token's value, no filesystem or network access. It is a pure, in-memory data-transformation library. Rendering and registration are deliberately left to `token-editor-*` packages and their host app — see `TokenTypeContract` in `@dtcg-editor/token-editor-contract`.

## Pipeline

A token document flows through four stages, in order: parse, resolve, (optionally) edit, serialize. Parsing always resolves internally before returning, and so does editing — so a `TokenDocument` you're holding is always fully resolved; you never call the resolve step yourself in normal use.

```typescript
import { parseTokenFile, applyTokenEdits, serializeTokenFile } from "@dtcg-editor/token-core";

const parsed = parseTokenFile(rawJsonText); // Result<TokenDocument, TokenParseError>
if (parsed.isOk()) {
  const edited = applyTokenEdits(parsed.value, [
    { path: ["color", "brand", "blue"], description: "Primary brand color" },
  ]);
  if (edited.isOk()) {
    const output = serializeTokenFile(edited.value); // Result<string, TokenSerializeError>
  }
}
```

| Stage | Function | What it does |
|---|---|---|
| Parse | `parseTokenFile` | Turns raw DTCG JSON text into a typed `TokenDocument` tree of `TokenNode`/`GroupNode`s. Validates the envelope and per-node metadata (`$type`, `$description`, `$deprecated`) via Zod; preserves every unrecognized `$`-prefixed field verbatim for round-trip fidelity. |
| Resolve | `resolveEffectiveDocument` | A single tree walk, run internally once per parse and once per edit batch, that materializes each node's *effective* type and deprecation status (see below). |
| Edit | `applyTokenEdits` | Applies a batch of edits (rename, retype, revalue, redescribe) to a document, producing a new immutable tree — then re-runs the resolve step internally before returning. |
| Serialize | `serializeTokenFile` | The inverse of parse: turns a `TokenDocument` back into DTCG JSON text. |

### Effective-field resolution

Deciding a node's actual, in-effect `$type`/`$deprecated` isn't always as simple as reading its own declaration — a group's `$type` is inherited by its descendants, and (new in this package) an undeclared token's type can be inferred from its value's shape. Rather than re-deriving this per call site, one upfront pass computes it once and stores the result on each node.

| Field | Meaning |
|---|---|
| `effectiveType` | The node's own declared `$type`, else the nearest ancestor group's declared `$type`, else — for a token only — a shape-based inference from its `$value` (`classifyValue`) when no declaration exists anywhere in its chain, else `undefined`. |
| `effectiveDeprecated` | The node's own `$deprecated`, else the nearest ancestor's, else `undefined` — the same inheritance shape as `effectiveType`, generalized to deprecation. |
| `inferredType` (tokens only) | Set exactly when `effectiveType` came from shape inference rather than a declaration — the value a UI can offer as an accept-or-change suggestion. Never written into the document as a side effect; only an explicit edit to a token's `type` field does that. |

Every call site that needs a node's effective type or deprecation status reads these materialized fields directly; nothing outside this module re-walks ancestors to compute them. `resolveEffectiveType`/`findNode` remain exported as the lower-level ancestor-walk/path-lookup primitives this pass (and editing) are built on — most callers should never need them directly.

```typescript
import { classifyValue } from "@dtcg-editor/token-core";

classifyValue({ colorSpace: "srgb", components: [0, 0, 0] }); // "color"
classifyValue({ nonsense: true }); // undefined — matches no known type
```

Serializing never writes the materialized fields back out — only a node's *declared* fields (`declaredType`, `description`, `deprecated`, `extensions`) are ever written, so an inferred-but-not-yet-accepted type can never leak into a saved file.

## Public API

Everything below is re-exported from `index.ts`.

### Parsing & serialization

| Export | Signature | Description |
|---|---|---|
| `parseTokenFile` | `(raw: unknown) => Result<TokenDocument, TokenParseError>` | The sanctioned entry point from raw file text to a typed, fully-resolved document. |
| `serializeTokenFile` | `(document: TokenDocument) => Result<string, TokenSerializeError>` | The inverse. |
| `TokenParseError` | — | Returned by `parseTokenFile` for any structural or schema problem. |
| `TokenSerializeError` | — | Returned by `serializeTokenFile` if the underlying `JSON.stringify` fails. |

### Types & structure

| Export | Description |
|---|---|
| `TokenDocument` | The parsed document: `{ root: GroupNode }`. |
| `DtcgNode` | `TokenNode \| GroupNode` — a node anywhere in the tree. |
| `TokenNode` | A leaf token (identified by having `$value`). |
| `GroupNode` | A container of nested tokens/groups. |
| `DTCG_TOKEN_TYPES` | The complete list of 13 `$type` values the DTCG 2025.10 Format spec defines. |
| `DtcgTokenType` | The type of one entry in `DTCG_TOKEN_TYPES`. |
| `isDtcgTokenType` | `(value: string) => value is DtcgTokenType` — recognizes a valid `$type` string. |

### Effective-field resolution exports

See [Effective-field resolution](#effective-field-resolution) above for what these compute.

| Export | Signature | Description |
|---|---|---|
| `resolveEffectiveDocument` | `(document: TokenDocument) => TokenDocument` | The single upfront resolution pass; called internally by `parseTokenFile`/`applyTokenEdits`, exported for direct/test use. |
| `classifyValue` | `(value: unknown) => DtcgTokenType \| undefined` | Shape-based type inference, given a value and no declared type in its chain. |
| `resolveEffectiveType` | `(node: DtcgNode, ancestors: readonly GroupNode[]) => string \| undefined` | Lower-level ancestor-walk primitive most callers shouldn't need directly. |
| `findNode` | `(root: GroupNode, path: readonly string[]) => { node: DtcgNode; ancestors: readonly GroupNode[] } \| undefined` | Locates a node by path, along with its ancestor chain. |

### Editing

`applyTokenEdits` is pure — it never mutates `document` or any node in it, and always returns a new tree. Despite the name, it also edits *groups* (currently just renaming), not only tokens, through the same batch.

| Export | Signature | Description |
|---|---|---|
| `applyTokenEdits` | `(document: TokenDocument, edits: readonly TokenEdit[]) => Result<TokenDocument, TokenEditError>` | Applies a batch of patches, producing a new immutable tree. |
| `TokenEdit` | `{ path: readonly string[]; name?: string; value?: unknown; description?: string; type?: string }` | One patch, identified by the target's current `path`. |
| `TokenEditError` | — | Returned for any edit that can't be applied (e.g. a name collision, an unknown path). |

### References

A *reference* is a token value pointing at another token's path via DTCG's `{a.b.c}` alias syntax. This package can detect and parse that syntax, and walk a chain of them, but has no concept of a multi-file document set on its own — the caller supplies that via `ReferenceLookup`.

```typescript
import { parseReference, resolveReference } from "@dtcg-editor/token-core";

const reference = parseReference("{color.brand.blue}");
// -> { targetPath: ["color", "brand", "blue"], at: [], raw: "{color.brand.blue}" }

if (reference) {
  const chain = resolveReference(reference, myLookup);
  // walks it to a literal value, a cycle, or a missing target
}
```

| Export | Signature | Description |
|---|---|---|
| `TokenReference` | `{ targetPath: readonly string[]; at: readonly (string \| number)[]; raw: string }` | One parsed reference: `targetPath` is the dot-separated path it points to, `at` is where inside the token's `$value` it was found (empty when the reference *is* the whole value), `raw` is the original text. |
| `parseReference` | `(value: unknown) => TokenReference \| undefined` | Detects the whole-string `{...}` form; pure and total — `undefined` just means "not a reference," never a thrown error. |
| `collectReferences` | `(value: unknown) => readonly TokenReference[]` | Finds every reference nested in a `$value` of any shape (object, array, arbitrarily deep) — e.g. every color reference in a `shadow` token's layers. |
| `ReferenceLookup` | `(path: readonly string[]) => LookupHit \| undefined` | A caller-supplied function resolving one path to the node found there; `undefined` means "no node at this path." |
| `LookupHit` | `{ node: DtcgNode; effectiveType: string \| undefined; file: string; mode: string \| undefined }` | What a `ReferenceLookup` returns for a resolved path; `file`/`mode` are opaque to this package, only carried through for the caller's own bookkeeping. |
| `resolveReference` | `(reference: TokenReference, lookup: ReferenceLookup) => ResolutionChain` | Follows a reference through every further reference it points to until it reaches a token with a non-reference value. Pure and total: no depth limit, but a `circular` outcome instead of an infinite loop if a path is revisited. |
| `ResolutionChain` | `{ steps: readonly ChainStep[]; outcome: ChainOutcome }` | The full result: every token traversed, in order, plus how the chain ended. |
| `ChainStep` | `{ path: readonly string[]; file: string; mode: string \| undefined }` | One token traversed while following the chain. |
| `ChainOutcome` | discriminated union | How a chain ended — see below. |

`ChainOutcome` is one of:

- **`{ kind: "resolved", value, type }`** — reached a token with a literal (non-reference) value.
- **`{ kind: "unresolved", missingPath }`** — a target somewhere in the chain doesn't exist.
- **`{ kind: "group-target", groupPath }`** — a reference points at a group, not a token.
- **`{ kind: "circular", cyclePath }`** — a path was revisited; the chain would otherwise loop forever.

### Per-type value schemas

Only types with a real schema today — see [Type coverage](#type-coverage) below.

| Module | Exports |
|---|---|
| `color.ts` | `ColorValueSchema`, `ColorObjectValueSchema`, `LegacyHexColorValueSchema`, `COLOR_SPACES`, and the `ColorValue`/`ColorObjectValue`/`ColorSpace`/`ColorComponent` types. |
| `dimension.ts` | `DimensionValueSchema`, `DimensionValue`. |

## Type coverage

DTCG 2025.10 defines 13 token types (`DTCG_TOKEN_TYPES`). Today, `token-core` has a real, spec-conformant Zod value schema for only 2 of them — `color` and `dimension`. `classifyValue`'s shape-inference registry iterates whatever schemas exist, so adding a schema for another type (e.g. `fontWeight`) automatically extends inference coverage with no further change to the inference logic itself.

## What this package deliberately does not do

This package's `parse → resolve → edit → serialize` pipeline shape was informed by [`@styleframe/dtcg`](https://www.styleframe.dev/docs/getting-started/integrations/dtcg)'s own `parse → validate → applyInheritance → resolveAliases` staged design (see `docs/research/styleframe-dtcg-spike.md`), but the library itself was evaluated and deliberately not adopted as a dependency.

- **No `@styleframe/dtcg` dependency.** Its `resolve()`/`resolveAliases()` abort the entire document on the first cycle or missing target found anywhere, which conflicts with this app's graceful-degradation requirement (one broken token must not block every other token from resolving). Everything in this package is hand-rolled.
- **No filesystem or network access.** A host app reads/writes files and passes raw text in and out; this package only ever transforms in-memory data.
- **No React or UI framework dependency.** Rendering and registration are `token-editor-*` packages' job, via `TokenTypeContract` (`@dtcg-editor/token-editor-contract`) — this package never imports React and has no opinion on how a value is displayed or edited.
