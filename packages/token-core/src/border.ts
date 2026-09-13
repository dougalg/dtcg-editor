import { z } from "zod";
import { ColorValueSchema } from "./color.ts";
import { DimensionValueSchema } from "./dimension.ts";
import { StrokeStyleValueSchema } from "./stroke-style.ts";

/**
 * The DTCG Border type's `$value` shape (designtokens.org/tr/2025.10/format):
 * a composite of exactly three required sub-fields, each reusing an existing
 * `token-core` value schema rather than redefining it — `color`
 * (`ColorValueSchema`), `width` (`DimensionValueSchema`), and `style`
 * (`StrokeStyleValueSchema`).
 */
export const BorderValueSchema = z.object({
	color: ColorValueSchema,
	width: DimensionValueSchema,
	style: StrokeStyleValueSchema,
});

export type BorderValue = z.infer<typeof BorderValueSchema>;
