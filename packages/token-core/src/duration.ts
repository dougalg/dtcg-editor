import { z } from "zod";

/**
 * The DTCG Duration type's `$value` shape (designtokens.org/tr/2025.10/format):
 * a numeric `value` and an explicit `unit`, which may only be `"ms"` or
 * `"s"` — required even when `value` is `0`. Unlike `dimension`'s `value`,
 * the spec requires duration's `value` to be non-negative (a negative
 * duration is meaningless), so `.min(0)` is enforced here — a deliberate
 * deviation from copying `dimension.ts`'s unconstrained `value` verbatim,
 * called out per Constitution Principle I.
 */
export const DurationValueSchema = z.object({
	value: z.number().min(0),
	unit: z.enum(["ms", "s"]),
});

export type DurationValue = z.infer<typeof DurationValueSchema>;
