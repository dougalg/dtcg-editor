import { z } from "zod";

/**
 * The DTCG Dimension type's `$value` shape (designtokens.org/tr/2025.10/format):
 * a numeric `value` and an explicit `unit`, which may only be `"px"` or
 * `"rem"` — required even when `value` is `0`.
 */
export const DimensionValueSchema = z.object({
  value: z.number(),
  unit: z.enum(["px", "rem"]),
});

export type DimensionValue = z.infer<typeof DimensionValueSchema>;
