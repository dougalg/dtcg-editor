import { z } from "zod";
import { DimensionValueSchema } from "./dimension.ts";

/**
 * The 8 named-style keywords the DTCG Stroke Style type permits as the
 * string form of `$value` (designtokens.org/tr/2025.10/format).
 */
const STROKE_STYLE_KEYWORDS = [
	"solid",
	"dashed",
	"dotted",
	"double",
	"groove",
	"ridge",
	"outset",
	"inset",
] as const;

/**
 * The DTCG Stroke Style type's `$value` shape (designtokens.org/tr/2025.10/format):
 * either one of the fixed named-style keywords above, or an object describing
 * a custom dash pattern — a `dashArray` of `DimensionValue`s (reusing
 * `token-core`'s own `DimensionValueSchema`) and a `lineCap`.
 */
export const StrokeStyleValueSchema = z.union([
	z.enum(STROKE_STYLE_KEYWORDS),
	z.object({
		dashArray: z.array(DimensionValueSchema),
		lineCap: z.enum(["round", "butt", "square"]),
	}),
]);

export type StrokeStyleValue = z.infer<typeof StrokeStyleValueSchema>;
