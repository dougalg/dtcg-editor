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
	 * Optional read-only rendering for a token of this type, given its raw
	 * (possibly-invalid) value — used wherever the host can't or shouldn't
	 * show an interactive `Editor` (the value fails `valueSchema`, or the
	 * host is in a read-only context). Types with nothing extra to show
	 * (e.g. dimension) omit this; the host falls back to plain text.
	 */
	ValidationErrorHandler?(props: {
		readonly value: unknown;
	}): ReactElement | null;
}
```

## Consumer contract: what `TreeNode.tsx` may depend on

After this refactor, `TreeNode.tsx` (and `TokenTree.tsx`) may reference only:

- `@dtcg-editor/token-type-contract` — `TokenTypeContract`, `TokenTypeEditorProps`,
  `validateTokenValue`, `TokenTypeValidationError`
- `@dtcg-editor/token-core` — `isDtcgTokenType` (already generic today)
- The app-local editor registry (`lib/token-editors/*`) — `resolveEditorForType`,
  `resolveBuiltInContract`, the resolved user config

It may **not** import from `@dtcg-editor/token-type-color`,
`@dtcg-editor/token-type-dimension`, or any other concrete token-type
package. This is the enforceable form of FR-001 / Story 3's acceptance
criteria — verifiable by grepping `TreeNode.tsx`'s import list (see
`quickstart.md`).

## Backward compatibility

- `ValidationErrorHandler` is optional — every existing `TokenTypeContract` implementer
  (including any third-party/user extension already written against today's
  shape) remains valid without modification; only `packages/token-type-color`
  needs to add an implementation to preserve its current swatch/issue display.
- No existing member's type changes, so no existing `Editor`/`valueSchema`
  implementation needs to change.

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
