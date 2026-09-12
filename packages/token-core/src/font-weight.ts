import { z } from "zod";

/**
 * The 18 keyword aliases the DTCG Font Weight type permits as an alternative
 * to a raw integer (designtokens.org/tr/2025.10/format), each with a
 * well-known equivalent numeric weight on the same 1-1000 scale (e.g. `bold`
 * = 700) — the alias is authoring convenience, not a distinct value space.
 */
const FONT_WEIGHT_ALIASES = [
	"thin",
	"hairline",
	"extra-light",
	"ultra-light",
	"light",
	"normal",
	"regular",
	"book",
	"medium",
	"semi-bold",
	"demi-bold",
	"bold",
	"extra-bold",
	"ultra-bold",
	"black",
	"heavy",
	"extra-black",
	"ultra-black",
] as const;

/**
 * The DTCG Font Weight type's `$value` shape (designtokens.org/tr/2025.10/format):
 * either an integer in the inclusive range 1-1000, or one of the fixed set of
 * keyword aliases above.
 */
export const FontWeightValueSchema = z.union([
	z.number().int().min(1).max(1000),
	z.enum(FONT_WEIGHT_ALIASES),
]);

export type FontWeightValue = z.infer<typeof FontWeightValueSchema>;
