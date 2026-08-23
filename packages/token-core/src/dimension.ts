import { type DTCGDimension, isDimensionValue } from "@styleframe/dtcg";
import { z } from "zod";

/**
 * SPIKE: structural shape (`{ value, unit }`) delegated to @styleframe/dtcg's
 * `isDimensionValue` guard. The library accepts arbitrary CSS unit strings
 * per the actual DTCG spec — this app deliberately narrows that to `"px"`
 * and `"rem"` only, so the library guard alone is *not* a drop-in
 * replacement; the unit whitelist has to stay layered on top by hand.
 */
export type DimensionValue = DTCGDimension & { unit: "px" | "rem" };

export const DimensionValueSchema = z.custom<DimensionValue>(
	(value) =>
		isDimensionValue(value) && (value.unit === "px" || value.unit === "rem"),
);
