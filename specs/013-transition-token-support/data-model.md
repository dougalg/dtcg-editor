# Phase 1 Data Model: Transition Token Editor Support

## `TransitionValue` (`packages/token-core/src/transition.ts`)

The DTCG `transition` type's `$value` shape (designtokens.org/tr/2025.10/format, Transition type):

| Field            | Type                              | Required | Notes                                             |
| ---------------- | ---------------------------------- | -------- | -------------------------------------------------- |
| `duration`       | `DurationValue`                    | yes      | Reused from `token-core`'s `DurationValueSchema`.  |
| `delay`          | `DurationValue`                    | yes      | Same schema as `duration`, semantically distinct.  |
| `timingFunction` | `CubicBezierValue`                 | yes      | Reused from `token-core`'s `CubicBezierValueSchema`.|

```ts
export const TransitionValueSchema = z.object({
	duration: DurationValueSchema,
	delay: DurationValueSchema,
	timingFunction: CubicBezierValueSchema,
});

export type TransitionValue = z.infer<typeof TransitionValueSchema>;
```

No new leaf types are introduced — `DurationValue` (`{ value: number, unit: "ms" | "s" }`) and
`CubicBezierValue` (`[number, number, number, number]`) are both pre-existing `token-core` types
(`packages/token-core/src/duration.ts`, `packages/token-core/src/cubic-bezier.ts`), unchanged by
this feature.

### Validation rules

- All three fields are required; a `transition` value missing any of `duration`, `delay`, or
  `timingFunction` fails validation.
- Each field's own validation rules apply unchanged: `duration`/`delay` reject a negative
  `value` or a unit outside `"ms"`/`"s"`; `timingFunction` rejects `P1x`/`P2x` outside `[0, 1]`.
- No cross-field validation rule exists (e.g. no rule relating `duration` to `delay`) — the DTCG
  spec defines none, and none is invented here.

### State transitions

Not applicable — a `TransitionValue` is edited in place (three independent field replacements),
not a stateful object with transitions of its own. Each field replacement is atomic from the
host's perspective: `TransitionEditor`'s `onChange` always receives one complete, valid
`TransitionValue` object (`{ ...value, [changedField]: next }`).

## Relationship to embedded editor packages

`TransitionEditor`/`TransitionPreview` do not introduce any new data model of their own beyond
`TransitionValue` above — they operate on slices of it (`value.duration`, `value.delay`,
`value.timingFunction`) using the exact `DurationValue`/`CubicBezierValue` types the embedded
`DurationEditor`/`CubicBezierEditor`/`DurationPreview`/`CubicBezierPreview` components already
expect, per their existing `TokenTypeEditorProps<TValue>` contracts.
