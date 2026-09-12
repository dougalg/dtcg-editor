# Phase 1 Data Model: Font Weight Token Editor Support

## Entity: `FontWeightValue`

The `$value` of a token whose `$type` is `fontWeight`, per the DTCG 2025.10 Format spec.

**Shape** (`packages/token-core/src/font-weight.ts`):

```ts
type FontWeightValue = number | FontWeightAlias;
```

Where `number` is validated as an integer in `[1, 1000]`, and `FontWeightAlias` is one of the
fixed literal strings:

| Alias         | Alias         | Alias        |
| ------------- | ------------- | ------------ |
| `thin`        | `light`       | `demi-bold`  |
| `hairline`    | `normal`      | `bold`       |
| `extra-light` | `regular`     | `extra-bold` |
| `ultra-light` | `book`        | `ultra-bold` |
|               | `medium`      | `black`      |
|               | `semi-bold`   | `heavy`      |
|               |               | `extra-black`|
|               |               | `ultra-black`|

**Validation rules**:

- If the value is a number: MUST be an integer; MUST be `>= 1` and `<= 1000`.
- If the value is a string: MUST be exactly one of the 18 aliases above (case-sensitive, exact
  match — no normalization).
- Any other shape (object, array, boolean, null, out-of-range number, non-integer number,
  unrecognized string) is invalid.

**No state transitions** — this is a plain literal value type, not a stateful entity. It has no
relationships to other entities beyond the generic DTCG token-node shape (`$type`, `$value`,
optional `$description`, etc.) every token already carries, which this feature does not change.

## Interface: `TokenTypeContract<FontWeightValue>`

See `contracts/token-type-contract.md` for the concrete contract object this feature implements.
