import { z } from "zod";
import { ColorValueSchema } from "./color.ts";
import { DimensionValueSchema } from "./dimension.ts";

/**
 * The DTCG Shadow type's single-layer `$value` shape
 * (designtokens.org/tr/2025.10/format): a composite of exactly five required
 * sub-fields, each reusing an existing `token-core` value schema rather than
 * redefining it — `color` (`ColorValueSchema`) and `offsetX`/`offsetY`/
 * `blur`/`spread` (`DimensionValueSchema`).
 */
export const ShadowLayerSchema = z.object({
	color: ColorValueSchema,
	offsetX: DimensionValueSchema,
	offsetY: DimensionValueSchema,
	blur: DimensionValueSchema,
	spread: DimensionValueSchema,
});

export type ShadowLayer = z.infer<typeof ShadowLayerSchema>;

/**
 * A shadow token's `$value` is either a single shadow layer, or an array of
 * one or more layers stacked together (multiple shadows applied together).
 * An empty array is not a valid shadow value — `.min(1)` enforces that a
 * shadow value must describe at least one layer.
 */
export const ShadowValueSchema = z.union([
	ShadowLayerSchema,
	z.array(ShadowLayerSchema).min(1),
]);

export type ShadowValue = z.infer<typeof ShadowValueSchema>;
