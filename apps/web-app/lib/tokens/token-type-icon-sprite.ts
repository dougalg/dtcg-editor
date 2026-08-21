/**
 * Assembles the individual `.svg` files in `./icons/` (the real source of
 * truth — see `./icons/NOTICE.md` for attribution) into one sprite of
 * `<symbol>` elements, meant to be injected into the page exactly once (see
 * `TokenTypeIconSprite`) and referenced everywhere else via
 * `<use href="#...">`, so a page with many token rows doesn't duplicate the
 * same icon markup once per row.
 */
import type { DtcgTokenType } from "@dtcg-editor/token-core";
import border from "./icons/border.svg?raw";
import color from "./icons/color.svg?raw";
import cubicBezier from "./icons/cubic-bezier.svg?raw";
import dimension from "./icons/dimension.svg?raw";
import duration from "./icons/duration.svg?raw";
import fallback from "./icons/fallback.svg?raw";
import fontFamily from "./icons/font-family.svg?raw";
import fontWeight from "./icons/font-weight.svg?raw";
import gradient from "./icons/gradient.svg?raw";
import number from "./icons/number.svg?raw";
import shadow from "./icons/shadow.svg?raw";
import strokeStyle from "./icons/stroke-style.svg?raw";
import transition from "./icons/transition.svg?raw";
import typography from "./icons/typography.svg?raw";

const ICON_ID_PREFIX = "dtcg-ed-icon-";

type IconKey = DtcgTokenType | "fallback";

const RAW_ICONS: Record<IconKey, string> = {
	color,
	dimension,
	fontFamily,
	fontWeight,
	duration,
	cubicBezier,
	number,
	strokeStyle,
	border,
	transition,
	shadow,
	gradient,
	typography,
	fallback,
};

/**
 * Turns one standalone `<svg viewBox="...">...</svg>` file's raw markup into
 * a `<symbol>` with a stable id. Regex-based, not full XML parsing — safe
 * here because every input is a file this repo owns and controls (see
 * `./icons/`), not third-party or user-supplied SVG.
 */
function toSymbol(id: string, raw: string): string {
	const viewBoxMatch = raw.match(/viewBox="([^"]*)"/);
	const viewBox = viewBoxMatch?.[1] ?? "0 0 24 24";
	const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
	const inner = innerMatch?.[1] ?? "";
	return `<symbol id="${id}" viewBox="${viewBox}">${inner}</symbol>`;
}

/**
 * The full sprite markup — every icon's `<symbol>`, wrapped in one hidden
 * `<svg>`. Assembled once at module load; `TokenTypeIconSprite` is
 * responsible for actually mounting it exactly once per page.
 */
export const TOKEN_TYPE_ICON_SPRITE_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${(
	Object.entries(RAW_ICONS) as [IconKey, string][]
)
	.map(([key, raw]) => toSymbol(`${ICON_ID_PREFIX}${key}`, raw))
	.join("")}</svg>`;

/**
 * Resolves the sprite symbol id for a token's type, falling back to the
 * generic icon id for a missing or unrecognized (non-standard) type — every
 * case is covered, so this never returns an id the sprite doesn't define.
 */
export function resolveTokenTypeIconId(
	type: DtcgTokenType | string | undefined,
): string {
	if (type !== undefined && type in RAW_ICONS) {
		return `${ICON_ID_PREFIX}${type}`;
	}
	return `${ICON_ID_PREFIX}fallback`;
}
