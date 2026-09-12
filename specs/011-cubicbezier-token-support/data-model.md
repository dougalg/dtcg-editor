# Phase 1 Data Model: cubicBezier Token Support

## CubicBezierValue

The DTCG `cubicBezier` token's `$value` shape (designtokens.org/tr/2025.10/format, Cubic Bezier
type).

| Index | Name  | Type   | Constraint                          |
| ----- | ----- | ------ | ------------------------------------ |
| 0     | P1x   | number | MUST be within `[0, 1]` inclusive    |
| 1     | P1y   | number | Unconstrained (any finite number)    |
| 2     | P2x   | number | MUST be within `[0, 1]` inclusive    |
| 3     | P2y   | number | Unconstrained (any finite number)    |

**Representation**: a fixed-length 4-tuple, `[P1x, P1y, P2x, P2y]` — not an object, matching the
DTCG spec's array shape for this type (distinct from `dimension`'s object shape).

**Validation rule** (FR-001, FR-002, FR-003): a `Zod` tuple schema —

```ts
z.tuple([
  z.number().min(0).max(1), // P1x
  z.number(),               // P1y
  z.number().min(0).max(1), // P2x
  z.number(),               // P2y
]);
```

`z.tuple` already enforces exact length (4) — too few or too many elements fails validation
(Edge Cases in `spec.md`). A non-numeric entry fails `z.number()`'s type check.

**State transitions**: None — this is an immutable value type. Editing one coordinate produces
a new 4-tuple with that one index replaced (FR-008); there is no multi-step lifecycle.

**Relationships**: A `cubicBezier` token may be referenced by another token (e.g. a future
`transition` composite token's `timingFunction` field) via the existing DTCG `{reference}`
mechanism already handled generically by `token-core`'s `resolveReference`/`resolve-effective`
modules — this feature adds no new reference-resolution logic, only the leaf value's schema and
UI.

**Round-trip fidelity** (Principle IX / FR-012): `serializeValue` is the identity function
(`(value) => value`), identical to `dimensionTokenType`'s pattern — the validated tuple already
is the exact on-disk JSON array shape, so parse → serialize introduces no transform and no data
loss, including for out-of-range `P1y`/`P2y` values (e.g. `[0.68, -0.55, 0.27, 1.55]`).
