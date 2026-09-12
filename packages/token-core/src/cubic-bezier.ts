import { z } from "zod";

/**
 * The DTCG Cubic Bezier type's `$value` shape (designtokens.org/tr/2025.10/format):
 * a 4-tuple `[P1x, P1y, P2x, P2y]` of numbers, the two control points of a cubic
 * bezier easing curve. Per spec, `P1x`/`P2x` (indices 0 and 2) MUST be within
 * `[0, 1]`; `P1y`/`P2y` (indices 1 and 3) are unconstrained — they may be negative
 * or greater than 1 for overshoot/bounce easings.
 */
export const CubicBezierValueSchema = z.tuple([
	z.number().min(0).max(1), // P1x
	z.number(), // P1y
	z.number().min(0).max(1), // P2x
	z.number(), // P2y
]);

export type CubicBezierValue = z.infer<typeof CubicBezierValueSchema>;
