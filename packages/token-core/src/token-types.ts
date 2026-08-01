/**
 * The complete set of `$type` values defined by the DTCG Format Module
 * 2025.10 spec's Type section (https://www.designtokens.org/tr/2025.10/format/) —
 * both the basic/primitive types (`color` through `number`) and the
 * composite types (`strokeStyle` through `typography`). This is the single
 * source of truth both the client (editor registration/rendering) and the
 * server (edit authorization) check a token's effective type against; no
 * second, independently-maintained copy of this list should exist anywhere
 * in the monorepo. Update this list only when the spec version this repo
 * targets changes.
 */
export const DTCG_TOKEN_TYPES = [
	"color",
	"dimension",
	"fontFamily",
	"fontWeight",
	"duration",
	"cubicBezier",
	"number",
	"strokeStyle",
	"border",
	"transition",
	"shadow",
	"gradient",
	"typography",
] as const;

export type DtcgTokenType = (typeof DTCG_TOKEN_TYPES)[number];

/** Whether `value` is one of the DTCG spec's recognized `$type` values. */
export function isDtcgTokenType(value: string): value is DtcgTokenType {
	return (DTCG_TOKEN_TYPES as readonly string[]).includes(value);
}
