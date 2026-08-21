/**
 * GENERATED FILE — do not hand-edit. Regenerate via `pnpm --filter web-app
 * generate:icons` (also runs automatically before `dev`/`build`) after
 * changing any file under `./icons/`, which remains the real source of
 * truth (and see `./icons/NOTICE.md` for attribution). Produced by
 * `scripts/generate-icon-sprite.ts`.
 *
 * Assembles the individual `.svg` files in `./icons/` into one sprite of
 * `<symbol>` elements, meant to be injected into the page exactly once (see
 * `TokenTypeIconSprite`) and referenced everywhere else via
 * `<use href="#...">`, so a page with many token rows doesn't duplicate the
 * same icon markup once per row.
 */
import type { DtcgTokenType } from "@dtcg-editor/token-core";

const ICON_ID_PREFIX = "dtcg-ed-icon-";

type IconKey = DtcgTokenType | "fallback";

const RAW_ICONS: Record<IconKey, string> = {
	color: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Color</title>
	<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
	<circle cx="13.5" cy="6.5" r="1" fill="#ef4444" stroke="none" />
	<circle cx="17.5" cy="10.5" r="1" fill="#eab308" stroke="none" />
	<circle cx="6.5" cy="12.5" r="1" fill="#3b82f6" stroke="none" />
	<circle cx="8.5" cy="7.5" r="1" fill="#22c55e" stroke="none" />
</svg>`,
	dimension: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Dimension</title>
	<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
	<path d="m14.5 12.5 2-2" />
	<path d="m11.5 9.5 2-2" />
	<path d="m8.5 6.5 2-2" />
	<path d="m17.5 15.5 2-2" />
</svg>`,
	fontFamily: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Font family</title>
	<path d="M12 4v16" />
	<path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
	<path d="M9 20h6" />
</svg>`,
	fontWeight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Font weight</title>
	<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
</svg>`,
	duration: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Duration</title>
	<path d="M12 3a9.75 9.75 0 0 1 6.74 2.74" />
	<path d="M18.74 5.74 21 8" />
	<path d="M21 8V3" />
	<path d="M7.5 19.794c-6-3.464-6-12.124 0-15.588" />
	<path d="M7.5 4.206A9 9 0 0 1 12 3" />
	<path d="M12 7v5l4 2" />
	<path d="M14 20.775A9 9 0 0 1 12 21" />
	<path d="M19 17.656a9 9 0 0 1-1.5 1.456" />
	<path d="M21 12a9 9 0 0 1-.228 2" />
	<path d="M21 8h-5" />
</svg>`,
	cubicBezier: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Cubic bezier</title>
	<circle cx="17" cy="4" r="2" />
	<path d="M15.59 5.41 5.41 15.59" />
	<circle cx="4" cy="17" r="2" />
	<path d="M12 22s-4-9-1.5-11.5S22 12 22 12" />
</svg>`,
	number: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Number</title>
	<line x1="4" x2="20" y1="9" y2="9" />
	<line x1="4" x2="20" y1="15" y2="15" />
	<line x1="10" x2="8" y1="3" y2="21" />
	<line x1="16" x2="14" y1="3" y2="21" />
</svg>`,
	strokeStyle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Stroke style</title>
	<path d="M11 5h2" />
	<path d="M15 12h6" />
	<path d="M19 5h2" />
	<path d="M3 12h6" />
	<path d="M3 19h18" />
	<path d="M3 5h2" />
</svg>`,
	border: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Border</title>
	<path d="M14 21h1" />
	<path d="M21 14v1" />
	<path d="M21 19a2 2 0 0 1-2 2" />
	<path d="M21 9v1" />
	<path d="M3 14v1" />
	<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" />
	<path d="M3 9v1" />
	<path d="M5 21a2 2 0 0 1-2-2" />
	<path d="M9 21h1" />
</svg>`,
	transition: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Transition</title>
	<path d="M18 8L22 12L18 16" />
	<path d="M2 12H22" />
</svg>`,
	shadow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Shadow</title>
	<path d="M12.5 11.134 18.196 21" />
	<path d="M20.425 5.299a10 10 0 0 0-16.941 9.78c.183.563.843.774 1.355.478L20.16 6.711c.512-.296.66-.973.264-1.413" />
	<path d="M21 21H3" />
</svg>`,
	gradient: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Gradient</title>
	<defs>
		<linearGradient id="dtcg-ed-gradient-icon-stroke" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="0">
			<stop offset="0" stop-color="#3b82f6" />
			<stop offset="0.5" stop-color="#a855f7" />
			<stop offset="1" stop-color="#ec4899" />
		</linearGradient>
	</defs>
	<path d="M2 10v3" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
	<path d="M6 6v11" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
	<path d="M10 3v18" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
	<path d="M14 8v7" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
	<path d="M18 5v13" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
	<path d="M22 10v3" stroke="url(#dtcg-ed-gradient-icon-stroke)" />
</svg>`,
	typography: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Typography</title>
	<path d="M10 13h4" />
	<path d="M12 6v7" />
	<path d="M16 8V6H8v2" />
	<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
</svg>`,
	fallback: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<title>Unknown type</title>
	<circle cx="12" cy="12" r="9" />
	<path d="M12 16v.01M12 8a2.5 2.5 0 0 1 2.5 2.5c0 1.5-2.5 1.75-2.5 3.5" />
</svg>`,
};

/**
 * Turns one standalone `<svg ...>...</svg>` file's raw markup into a
 * `<symbol>` with a stable id, carrying over every presentation attribute
 * from the source `<svg>` tag (`fill`, `stroke`, `stroke-width`,
 * `stroke-linecap`, `stroke-linejoin`, ...) except `xmlns` — `<symbol>`
 * doesn't take one, and dropping it is harmless since the sprite's own outer
 * `<svg>` already declares the namespace once. Losing those attributes was
 * the earlier bug here: with only `id`/`viewBox` kept, every inner
 * `<path>`/`<circle>` fell back to SVG's own defaults (`fill: black`,
 * `stroke: none`) instead of inheriting `stroke="currentColor"` — and
 * since most of these icons are stroke-only line art with zero fill-area,
 * that made them render as literally nothing, not merely the wrong color.
 * Regex-based, not full XML parsing — safe here because every input is a
 * file this repo owns and controls (see `./icons/`), not third-party or
 * user-supplied SVG.
 */
function toSymbol(id: string, raw: string): string {
	const openTagMatch = raw.match(/<svg([^>]*)>/);
	const attrsSource = openTagMatch?.[1] ?? "";
	const attrs = attrsSource.replace(/\s*xmlns="[^"]*"/, "").trim();
	const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
	const inner = innerMatch?.[1] ?? "";
	return `<symbol id="${id}"${attrs.length > 0 ? ` ${attrs}` : ""}>${inner}</symbol>`;
}

/**
 * The full sprite markup — every icon's `<symbol>`, wrapped in one hidden
 * `<svg>`. `TokenTypeIconSprite` is responsible for actually mounting it
 * exactly once per page.
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
