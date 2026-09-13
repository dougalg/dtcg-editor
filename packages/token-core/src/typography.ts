import { z } from "zod";
import { DimensionValueSchema } from "./dimension.ts";
import { FontFamilyValueSchema } from "./font-family.ts";
import { FontWeightValueSchema } from "./font-weight.ts";

/**
 * The DTCG Typography type's `$value` shape (designtokens.org/tr/2025.10/format):
 * a composite of exactly five required sub-fields, each reusing an existing
 * `token-core` value schema rather than redefining it — `fontFamily`
 * (`FontFamilyValueSchema`), `fontSize` (`DimensionValueSchema`), `fontWeight`
 * (`FontWeightValueSchema`), `letterSpacing` (`DimensionValueSchema`) — except
 * `lineHeight`, which the spec defines as a bare unitless multiplier
 * (`number`), not a Dimension value, so it is modeled as a plain `z.number()`
 * rather than reusing `DimensionValueSchema`.
 */
export const TypographyValueSchema = z.object({
	fontFamily: FontFamilyValueSchema,
	fontSize: DimensionValueSchema,
	fontWeight: FontWeightValueSchema,
	letterSpacing: DimensionValueSchema,
	lineHeight: z.number(),
});

export type TypographyValue = z.infer<typeof TypographyValueSchema>;
