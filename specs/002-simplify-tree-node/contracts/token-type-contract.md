# Interface Contract: `TokenTypeContract`

This project's actual public interface surface for this feature isn't a
network API — it's the `TokenTypeContract<TValue>` TypeScript interface
(`packages/token-type-contract/src/contract.ts`), the pluggable boundary
every token-type package (built-in or a host app's own extension) implements,
and the only interface `TreeNode.tsx` is allowed to depend on after this
refactor (per FR-001–FR-003). This document is the contract's before/after
shape.

## Before

```ts
export interface TokenTypeContract<TValue> {
	readonly type: string;
	readonly valueSchema: z.ZodType<TValue>;
	serializeValue(value: TValue): unknown;
	Editor(props: TokenTypeEditorProps<TValue>): ReactElement;
	readonly editorOptionsSchema?: z.ZodType<unknown>;
}
```

## After

```ts
export interface TokenTypeContract<TValue> {
	readonly type: string;
	readonly valueSchema: z.ZodType<TValue>;
	serializeValue(value: TValue): unknown;
	Editor(props: TokenTypeEditorProps<TValue>): ReactElement;
	readonly editorOptionsSchema?: z.ZodType<unknown>;

	/**
	 * Read-only rendering for a token of this type whose raw value has
	 * already failed `valueSchema` — used wherever the host can't show an
	 * interactive `Editor` because the value doesn't parse. The host (`TreeNode.tsx`)
	 * only ever calls this once it has already run `validateTokenValue` and
	 * confirmed the result is an `err`, so `error` is always a concrete
	 * `TokenTypeValidationError`, not a `Result` an implementer would need to
	 * unwrap. It may still need its own type-specific checks for richer
	 * per-field messages than `error.issues` alone can produce (see
	 * `TokenTypeValidationError` below for the mitigation and its limits).
	 * Types with nothing extra to show (e.g. dimension) omit this; the host
	 * falls back to plain text. Note this is strictly for the
	 * doesn't-parse-at-all case — a value that parses successfully but that a
	 * type wants to flag for some other reason (e.g. color's in-range check)
	 * is the `Editor`'s own concern, rendered alongside the interactive UI,
	 * since `Editor` already receives an already-validated `TValue` to
	 * inspect (see `packages/token-type-color`'s `components/editor.tsx`).
	 */
	ValidationErrorHandler?(props: {
		readonly value: unknown;
		readonly error: TokenTypeValidationError;
	}): ReactElement | null;
}
```

## `TokenTypeValidationError` (changed)

`packages/token-type-contract/src/contract.ts`

```ts
/** One issue from a `valueSchema` parse, in the same shape Zod itself reports it. */
export interface TokenTypeValidationIssue {
	/**
	 * Raw path segments to the offending field (e.g. `["components", 0]`),
	 * left unjoined so an implementer can decide how to use it — format it,
	 * match against it to highlight one specific input, group issues by
	 * top-level field, etc. Empty for a top-level/whole-value issue.
	 */
	readonly path: readonly PropertyKey[];
	/** Zod's human-readable message for this issue alone. */
	readonly message: string;
	/**
	 * Zod's issue code (e.g. `"invalid_type"`, `"invalid_enum_value"`,
	 * `"invalid_union"`). Exists for future non-text handling (e.g. a
	 * code-specific fix suggestion) and to let an implementer detect the
	 * `"invalid_union"` case called out below.
	 */
	readonly code: string;
}

export class TokenTypeValidationError extends Error {
	/**
	 * Structured per-issue detail from `valueSchema`'s Zod parse — the
	 * granularity `ValidationErrorHandler` needs for a field-level
	 * breakdown, as an array of objects (not pre-formatted strings) so a
	 * future consumer can extend how it uses `code`/`path` without a
	 * contract change. `message` (inherited from `Error`) is unchanged:
	 * still the same issues joined into one string with no path prefix, so
	 * no existing consumer of `.message` (e.g. `TreeNode.tsx`'s single-line
	 * field-error display) changes behavior.
	 */
	readonly issues: readonly TokenTypeValidationIssue[];
}
```

**Limit**: for a `z.union`-typed `valueSchema` (e.g. color's `ColorValueSchema`,
a union of the object and legacy-hex shapes), Zod's default union error
reports one top-level issue (`code: "invalid_union"`, `path: []`, `message:
"Invalid input"`) rather than one issue per failing field — `error.issues`
inherits that same limitation, since it's derived from the same `safeParse`
call `error.message` already was; an implementer can check for `code ===
"invalid_union"` to detect this case, but doing so still doesn't recover
per-field detail. A contract implementer whose `valueSchema` is a union and
that wants better structural messages for `ValidationErrorHandler` must still
validate the raw `value` against its own branch schemas directly, as
`packages/token-type-color` already does today — the host-supplied `error` is
a convenience (a ready-made `TokenTypeValidationError`, with no `Result` to
unwrap), not a guaranteed replacement for type-specific validation.

## Consumer contract: what `TreeNode.tsx` may depend on

After this refactor, `TreeNode.tsx`, `TreeTokenNode.tsx`, `TreeGroupNode.tsx`
(per the 2026-08-16 follow-up's component split — see plan.md), and
`TokenTree.tsx` may reference only:

- `@dtcg-editor/token-type-contract` — `TokenTypeContract`, `TokenTypeEditorProps`,
  `validateTokenValue`, `TokenTypeValidationError`
- `@dtcg-editor/token-core` — `isDtcgTokenType` (already generic today)
- The app-local editor registry (`lib/token-editors/*`) — `resolveEditorForType`,
  `resolveBuiltInContract`, the resolved user config

None of these four components may import from
`@dtcg-editor/token-type-color`, `@dtcg-editor/token-type-dimension`, or any
other concrete token-type package. This is the enforceable form of FR-001 /
Story 3's acceptance criteria — verifiable by grepping each component's
import list (see `quickstart.md`). In practice only `TreeTokenNode.tsx` ever
touches `TokenTypeContract`/`validateTokenValue`/`resolveBuiltInContract` at
all — `TreeNode.tsx` (a plain dispatcher) and `TreeGroupNode.tsx` (rename/
expand-collapse only) have no reason to import any of this list, but the
constraint still applies to all four uniformly.

## Backward compatibility

- `ValidationErrorHandler` is optional — every existing `TokenTypeContract` implementer
  (including any third-party/user extension already written against today's
  shape) remains valid without modification; only `packages/token-type-color`
  needs to add an implementation to preserve its current swatch/issue display.
- No existing member's type changes, so no existing `Editor`/`valueSchema`
  implementation needs to change.
- `TokenTypeValidationError.issues` is additive — `message` keeps its exact
  prior derivation and format, so no existing consumer of `.message` (e.g.
  `TreeNode.tsx`'s single-line field-error display) changes behavior.

## Implementer contract: where a first-party package's contract fields live

The `TokenTypeContract` interface's shape is unaffected by the 2026-08-16
clarification — but per FR-009/FR-010/FR-011, a first-party token-type
package's _source layout_ is now constrained in how it produces the values
plugged into that interface:

| Contract field                            | Sourced from                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `type`, `valueSchema`, `serializeValue`   | The package's core value module (e.g. `color.ts`)                                |
| `Editor`                                  | `src/components/editor.tsx`                                                      |
| `ValidationErrorHandler` (if implemented) | `src/components/<name>.tsx` (e.g. `src/components/validation-error-handler.tsx`) |
| `editorOptionsSchema` (if implemented)    | `src/configuration.ts`                                                           |

`src/token-type.ts` remains the single module that imports from all of the
above and assembles the `TokenTypeContract` object — this file itself is not
part of the `components/`/`configuration.ts` split, since it isn't UI or
config, it's the contract-assembly glue. This layout constraint applies only
to `packages/token-type-*` packages (FR-012); it is not part of the
`TokenTypeContract` TypeScript interface itself and does not apply to a host
app's inline custom extension.
