import { TOKEN_TYPE_ICON_SPRITE_MARKUP } from "../../assets/icon-sprite.ts";

/**
 * Injects the token-type icon sprite (see `assets/icon-sprite.ts`) into
 * the page exactly once. Every `<TokenBlock>` then references an icon via
 * `<use href="#dtcg-ed-icon-...">` instead of duplicating that icon's full
 * markup per row. Must be mounted once per page — rendering it more than
 * once would duplicate the `<symbol>` ids and produce invalid, ambiguous
 * `id` references.
 */
export function TokenTypeIconSprite() {
	return (
		<div
			// biome-ignore lint/security/noDangerouslySetInnerHtml: sprite markup is assembled at build time from this repo's own vendored .svg files (see assets/icons/), never from user/runtime input.
			dangerouslySetInnerHTML={{ __html: TOKEN_TYPE_ICON_SPRITE_MARKUP }}
		/>
	);
}
