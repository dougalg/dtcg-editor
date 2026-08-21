import type { DtcgTokenType } from "@dtcg-editor/token-core";

/**
 * Maps each `DtcgTokenType` to its icon's `<symbol>` id in
 * `public/icon-sprite.svg` (see `scripts/generate-icon-sprite.ts`, which
 * derives each id from its source file's name under `assets/icons/`).
 */
const ICON_ID_BY_TYPE: Record<DtcgTokenType, string> = {
	color: "dtcg-ed-icon-color",
	dimension: "dtcg-ed-icon-dimension",
	fontFamily: "dtcg-ed-icon-font-family",
	fontWeight: "dtcg-ed-icon-font-weight",
	duration: "dtcg-ed-icon-duration",
	cubicBezier: "dtcg-ed-icon-cubic-bezier",
	number: "dtcg-ed-icon-number",
	strokeStyle: "dtcg-ed-icon-stroke-style",
	border: "dtcg-ed-icon-border",
	transition: "dtcg-ed-icon-transition",
	shadow: "dtcg-ed-icon-shadow",
	gradient: "dtcg-ed-icon-gradient",
	typography: "dtcg-ed-icon-typography",
};

const FALLBACK_ICON_ID = "dtcg-ed-icon-fallback";

/**
 * Resolves the `public/icon-sprite.svg` symbol id for a token's type,
 * falling back to the generic icon id for a missing or unrecognized
 * (non-standard) type — every case is covered, so this never returns an id
 * the sprite doesn't define.
 */
export function resolveTokenTypeIconId(
	type: DtcgTokenType | string | undefined,
): string {
	if (type !== undefined && type in ICON_ID_BY_TYPE) {
		return ICON_ID_BY_TYPE[type as DtcgTokenType];
	}
	return FALLBACK_ICON_ID;
}
