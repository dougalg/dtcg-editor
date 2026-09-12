import { z } from "zod";

/**
 * The DTCG Font Weight type's `$value` shape (designtokens.org/tr/2025.10/format):
 * an integer in the inclusive range 1-1000. The keyword-alias branch is added
 * in a later commit as more behaviors are driven in.
 */
export const FontWeightValueSchema = z.number().int().min(1).max(1000);

export type FontWeightValue = z.infer<typeof FontWeightValueSchema>;
