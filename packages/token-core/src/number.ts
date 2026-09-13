import { z } from "zod";

/**
 * The DTCG Number type's `$value` shape (designtokens.org/tr/2025.10/format): a
 * bare, unitless number — used for things like opacity, line-height, z-index, or
 * scale factors. `z.number()` already rejects `NaN`/`Infinity`/`-Infinity` (both
 * fail its internal finiteness check), so no separate `.finite()` call is needed.
 * Unlike `FontWeightValue`, there is no integer/range constraint and no keyword
 * alias form.
 */
export const NumberValueSchema = z.number();

export type NumberValue = z.infer<typeof NumberValueSchema>;
