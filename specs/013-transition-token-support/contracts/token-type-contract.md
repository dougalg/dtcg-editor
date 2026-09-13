# Contract: `transitionTokenType` (`TokenTypeContract<TransitionValue>`)

Implements the existing `TokenTypeContract<TValue>` interface from
`@dtcg-editor/token-editor-contract` (unmodified by this feature — see
`packages/token-editor-contract/src/contract.ts`).

```ts
export const transitionTokenType: TokenTypeContract<TransitionValue> = {
	type: "transition",
	valueSchema: TransitionValueSchema,
	serializeValue: (value) => value,
	Editor: TransitionEditor,
	Preview: TransitionPreview,
};
```

## `Editor` contract

`TransitionEditor(props: TokenTypeEditorProps<TransitionValue>): ReactElement`

- **Input**: `props.value: TransitionValue` (already validated by `valueSchema` before this
  component is ever rendered, per the host's existing validate-then-render flow — matches every
  other built-in type's `Editor`).
- **Output**: renders three labeled sub-controls:
  - "Duration" → `<DurationEditor value={value.duration} onChange={...} />`
  - "Delay" → `<DurationEditor value={value.delay} onChange={...} />`
  - "Timing function" → `<CubicBezierEditor value={value.timingFunction} onChange={...} />`
- **Behavior**: each sub-control's `onChange` calls `props.onChange` with
  `{ ...props.value, [field]: next }` — never mutates or drops the other two fields.

## `Preview` contract

`TransitionPreview(props: { value: unknown }): ReactElement | null`

- **Input**: `props.value: unknown` — not guaranteed to be a `TransitionValue` (may come from
  resolving an arbitrary other token).
- **Behavior**: `TransitionValueSchema.safeParse(props.value)`; returns `null` on failure.
- **Output on success**: one `<span>` with text combining the duration and timing function
  (matching `DurationPreview`/`CubicBezierPreview`'s own text formatting), including the delay
  only when its numeric `value` is non-zero, e.g.:
  - `delay.value === 0`: `"200ms cubic-bezier(0.4, 0, 0.2, 1)"`
  - `delay.value !== 0`: `"200ms cubic-bezier(0.4, 0, 0.2, 1), delay 100ms"`

## Registration contract

`apps/web-app/lib/token-editors/built-in.ts`:

- `"transition"` added to `BUILT_IN_TOKEN_TYPES`.
- `transition: transitionTokenType as unknown as TokenTypeContract<unknown>` added to
  `builtInContractsByType`, matching the existing per-type erasure-safety comment pattern.
