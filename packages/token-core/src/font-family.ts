import { z } from "zod";

/**
 * The DTCG Font Family type's `$value` shape (designtokens.org/tr/2025.10/format):
 * either a single string (one font family name, e.g. `"Helvetica"`), or an
 * array of strings (a preference-ordered fallback stack, e.g.
 * `["Helvetica", "Arial", "sans-serif"]`), possibly empty.
 */
export const FontFamilyValueSchema = z.union([z.string(), z.array(z.string())]);

export type FontFamilyValue = z.infer<typeof FontFamilyValueSchema>;
