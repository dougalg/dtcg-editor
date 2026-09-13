import { z } from "zod";
import { CubicBezierValueSchema } from "./cubic-bezier.ts";
import { DurationValueSchema } from "./duration.ts";

/**
 * The DTCG Transition type's `$value` shape (designtokens.org/tr/2025.10/format):
 * an object of `duration`, `delay` (both Duration values) and `timingFunction`
 * (a CubicBezier value). Composed directly from the existing `DurationValueSchema`
 * and `CubicBezierValueSchema` rather than redefining equivalent shapes, per
 * Constitution Principle II (single source of truth for a value shape lives in
 * one place in `token-core`).
 */
export const TransitionValueSchema = z.object({
	duration: DurationValueSchema,
	delay: DurationValueSchema,
	timingFunction: CubicBezierValueSchema,
});

export type TransitionValue = z.infer<typeof TransitionValueSchema>;
