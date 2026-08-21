import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	nodeReadFileSync,
	nodeWriteFileSync,
} from "../lib/platform/node-fs.ts";

/**
 * Regenerates `lib/tokens/token-type-icon-sprite.ts` from the standalone
 * `.svg` files in `lib/tokens/icons/` (the actual, hand-edited source of
 * truth — see that folder's `NOTICE.md` for attribution).
 *
 * Why this exists: `.svg?raw` imports type-check and bundle successfully
 * under both Vite (this app's test runner) and Turbopack (`next build`),
 * but only Vite actually resolves them to the file's raw text content at
 * runtime — Turbopack's built-in static-asset handling for `.svg` intercepts
 * the import first, so `raw` is not a string when the code actually runs
 * (`next dev`/`next start`). Reading the files at build/codegen time here,
 * with plain `fs`, sidesteps that bundler-specific runtime gap entirely.
 *
 * Run via `pnpm --filter web-app generate:icons`, and automatically before
 * `dev`/`build` (see package.json) so the generated file can never silently
 * go stale relative to `lib/tokens/icons/`.
 */

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(SCRIPT_DIR, "../lib/tokens/icons");
const OUTPUT_FILE = join(SCRIPT_DIR, "../lib/tokens/token-type-icon-sprite.ts");

/** Keys match `DtcgTokenType` plus `"fallback"` — kept as plain strings here
 * (rather than importing the type) so this script has no dependency on the
 * app's TypeScript project graph; `token-type-icon-sprite.ts` itself is
 * still fully typed against `DtcgTokenType`. */
const ICON_FILES: Record<string, string> = {
	color: "color.svg",
	dimension: "dimension.svg",
	fontFamily: "font-family.svg",
	fontWeight: "font-weight.svg",
	duration: "duration.svg",
	cubicBezier: "cubic-bezier.svg",
	number: "number.svg",
	strokeStyle: "stroke-style.svg",
	border: "border.svg",
	transition: "transition.svg",
	shadow: "shadow.svg",
	gradient: "gradient.svg",
	typography: "typography.svg",
	fallback: "fallback.svg",
};

function escapeTemplateLiteral(raw: string): string {
	return raw
		.replace(/\\/g, "\\\\")
		.replace(/`/g, "\\`")
		.replace(/\$\{/g, "\\${");
}

function generate(): string {
	const entries = Object.entries(ICON_FILES).map(([key, fileName]) => {
		const raw = nodeReadFileSync(join(ICONS_DIR, fileName));
		return `\t${key}: \`${escapeTemplateLiteral(raw.trim())}\`,`;
	});

	return `/**
 * GENERATED FILE — do not hand-edit. Regenerate via \`pnpm --filter web-app
 * generate:icons\` (also runs automatically before \`dev\`/\`build\`) after
 * changing any file under \`./icons/\`, which remains the real source of
 * truth (and see \`./icons/NOTICE.md\` for attribution). Produced by
 * \`scripts/generate-icon-sprite.ts\`.
 *
 * Assembles the individual \`.svg\` files in \`./icons/\` into one sprite of
 * \`<symbol>\` elements, meant to be injected into the page exactly once (see
 * \`TokenTypeIconSprite\`) and referenced everywhere else via
 * \`<use href="#...">\`, so a page with many token rows doesn't duplicate the
 * same icon markup once per row.
 */
import type { DtcgTokenType } from "@dtcg-editor/token-core";

const ICON_ID_PREFIX = "dtcg-ed-icon-";

type IconKey = DtcgTokenType | "fallback";

const RAW_ICONS: Record<IconKey, string> = {
${entries.join("\n")}
};

/**
 * Turns one standalone \`<svg viewBox="...">...</svg>\` file's raw markup into
 * a \`<symbol>\` with a stable id. Regex-based, not full XML parsing — safe
 * here because every input is a file this repo owns and controls (see
 * \`./icons/\`), not third-party or user-supplied SVG.
 */
function toSymbol(id: string, raw: string): string {
	const viewBoxMatch = raw.match(/viewBox="([^"]*)"/);
	const viewBox = viewBoxMatch?.[1] ?? "0 0 24 24";
	const innerMatch = raw.match(/<svg[^>]*>([\\s\\S]*)<\\/svg>/);
	const inner = innerMatch?.[1] ?? "";
	return \`<symbol id="\${id}" viewBox="\${viewBox}">\${inner}</symbol>\`;
}

/**
 * The full sprite markup — every icon's \`<symbol>\`, wrapped in one hidden
 * \`<svg>\`. \`TokenTypeIconSprite\` is responsible for actually mounting it
 * exactly once per page.
 */
export const TOKEN_TYPE_ICON_SPRITE_MARKUP = \`<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">\${(
	Object.entries(RAW_ICONS) as [IconKey, string][]
)
	.map(([key, raw]) => toSymbol(\`\${ICON_ID_PREFIX}\${key}\`, raw))
	.join("")}</svg>\`;

/**
 * Resolves the sprite symbol id for a token's type, falling back to the
 * generic icon id for a missing or unrecognized (non-standard) type — every
 * case is covered, so this never returns an id the sprite doesn't define.
 */
export function resolveTokenTypeIconId(
	type: DtcgTokenType | string | undefined,
): string {
	if (type !== undefined && type in RAW_ICONS) {
		return \`\${ICON_ID_PREFIX}\${type}\`;
	}
	return \`\${ICON_ID_PREFIX}fallback\`;
}
`;
}

nodeWriteFileSync(OUTPUT_FILE, generate());
console.log(`Wrote ${OUTPUT_FILE}`);
