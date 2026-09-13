# Phase 1 Data Model: Number Token Editor Support

## Entity: `NumberValue`

The `$value` of a token whose `$type` is `number`, per the DTCG 2025.10 Format spec.

**Shape** (`packages/token-core/src/number.ts`):

```ts
type NumberValue = number;
```

A bare, unitless, finite JavaScript number — used for things like opacity, line-height, z-index,
or scale factors.

**Validation rules**:

- MUST be a JavaScript `number` (not a numeric string, not an object/array/boolean/null).
- MUST be finite — `NaN`, `Infinity`, and `-Infinity` are rejected (Zod's `z.number()` rejects
  these by default).
- Any sign, magnitude, and fractional precision is otherwise valid — no `min`/`max`, no integer
  constraint, unlike `FontWeightValue`.

**No state transitions** — this is a plain literal value type, not a stateful entity. It has no
relationships to other entities beyond the generic DTCG token-node shape (`$type`, `$value`,
optional `$description`, etc.) every token already carries, which this feature does not change.

## Interface: `TokenTypeContract<NumberValue>`

See `contracts/token-type-contract.md` for the concrete contract object this feature implements.
