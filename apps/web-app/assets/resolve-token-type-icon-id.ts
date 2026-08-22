import type { DtcgTokenType } from "@dtcg-editor/token-core";
import { TOKEN_TYPES_SPRITE_ICON_IDS } from "./generated/token-types-sprite.ids.ts";

/**
 * Maps each `DtcgTokenType` to its icon's `<symbol>` id in
 * `public/token-types-sprite.svg`. Values are sourced from the generated
 * `TOKEN_TYPES_SPRITE_ICON_IDS` (see `scripts/generate-icon-sprite.ts`) so
 * they can never drift from what the sprite actually contains — only the
 * type-to-basename mapping itself is hand-written here, since that's an
 * app-domain decision the generic generator has no way to know.
 */
const ICON_ID_BY_TYPE: Record<DtcgTokenType, string> = {
	color: TOKEN_TYPES_SPRITE_ICON_IDS.color,
	dimension: TOKEN_TYPES_SPRITE_ICON_IDS.dimension,
	fontFamily: TOKEN_TYPES_SPRITE_ICON_IDS["font-family"],
	fontWeight: TOKEN_TYPES_SPRITE_ICON_IDS["font-weight"],
	duration: TOKEN_TYPES_SPRITE_ICON_IDS.duration,
	cubicBezier: TOKEN_TYPES_SPRITE_ICON_IDS["cubic-bezier"],
	number: TOKEN_TYPES_SPRITE_ICON_IDS.number,
	strokeStyle: TOKEN_TYPES_SPRITE_ICON_IDS["stroke-style"],
	border: TOKEN_TYPES_SPRITE_ICON_IDS.border,
	transition: TOKEN_TYPES_SPRITE_ICON_IDS.transition,
	shadow: TOKEN_TYPES_SPRITE_ICON_IDS.shadow,
	gradient: TOKEN_TYPES_SPRITE_ICON_IDS.gradient,
	typography: TOKEN_TYPES_SPRITE_ICON_IDS.typography,
};

const FALLBACK_ICON_ID = TOKEN_TYPES_SPRITE_ICON_IDS.fallback;

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
