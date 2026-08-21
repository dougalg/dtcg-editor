import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	nodeReadFileSync,
	nodeWriteFileSync,
} from "../lib/platform/node-fs.ts";

/**
 * Regenerates `public/icon-sprite.svg` from the standalone `.svg` files in
 * `assets/icons/` (the actual, hand-edited source of truth — see that
 * folder's `NOTICE.md` for attribution). A real static asset, served by
 * Next.js at `/icon-sprite.svg` and referenced from components via
 * `<use href="/icon-sprite.svg#...">` — not inlined into the JS bundle.
 * Confirmed (Chromium, via a standalone Playwright check) that `currentColor`
 * on the referencing `<svg>`/`<use>` correctly resolves inside a
 * cross-document `<use>` reference, so this loses no theming versus an
 * inlined sprite.
 *
 * Run via the web-app package's `generate:icons` script (also runs
 * automatically before `dev`/`build`, see package.json) so the generated
 * file can never silently go stale relative to `assets/icons/`.
 */

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(SCRIPT_DIR, "../assets/icons");
const OUTPUT_FILE = join(SCRIPT_DIR, "../public/icon-sprite.svg");

/** Filename plus a one-line attribution comment emitted just above each
 * `<symbol>` — folds `assets/icons/NOTICE.md`'s attribution inline into the
 * generated sprite too, not only that file. */
const ICON_FILES: ReadonlyArray<{
	readonly file: string;
	readonly source: string;
}> = [
	{ file: "border.svg", source: "Lucide's square-dashed-top-solid.svg" },
	{ file: "color.svg", source: "Lucide's palette.svg, dots recolored" },
	{ file: "cubic-bezier.svg", source: "Lucide's tangent.svg" },
	{ file: "dimension.svg", source: "Lucide's ruler.svg" },
	{
		file: "duration.svg",
		source: "Lucide's rotate-cw-fading-clock.svg",
	},
	{ file: "fallback.svg", source: "original artwork, not from Lucide" },
	{ file: "font-family.svg", source: "Lucide's type.svg" },
	{ file: "font-weight.svg", source: "Lucide's bold.svg" },
	{
		file: "gradient.svg",
		source: "Lucide's audio-lines.svg, strokes gradient-filled",
	},
	{ file: "number.svg", source: "Lucide's hash.svg" },
	{ file: "shadow.svg", source: "Lucide's parasol.svg" },
	{ file: "stroke-style.svg", source: "Lucide's line-style.svg" },
	{ file: "transition.svg", source: "Lucide's move-right.svg" },
	{ file: "typography.svg", source: "Lucide's book-type.svg" },
];

/**
 * Turns one standalone `<svg ...>...</svg>` file's raw markup into a
 * `<symbol>` with a stable id (its filename, minus `.svg`, prefixed —
 * see `resolveTokenTypeIconId` in `assets/resolve-token-type-icon-id.ts`
 * for the token-type -> id mapping consumers actually use), carrying over
 * every presentation attribute from the source `<svg>` tag (`fill`,
 * `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, ...) except
 * `xmlns` — `<symbol>` doesn't take one, and dropping it is harmless since
 * the sprite's own outer `<svg>` already declares the namespace once.
 * Dropping those attributes was an earlier bug here: with only `id`/
 * `viewBox` kept, every inner `<path>`/`<circle>` fell back to SVG's own
 * defaults (`fill: black`, `stroke: none`) instead of inheriting
 * `stroke="currentColor"` — and since most of these icons are stroke-only
 * line art with zero fill-area, that made them render as literally nothing,
 * not merely the wrong color. Regex-based, not full XML parsing — safe here
 * because every input is a file this repo owns and controls (see
 * `assets/icons/`), not third-party or user-supplied SVG.
 */
function toSymbol(id: string, raw: string): string {
	const openTagMatch = raw.match(/<svg([^>]*)>/);
	const attrsSource = openTagMatch?.[1] ?? "";
	const attrs = attrsSource.replace(/\s*xmlns="[^"]*"/, "").trim();
	const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
	const inner = innerMatch?.[1] ?? "";
	return `<symbol id="${id}"${attrs.length > 0 ? ` ${attrs}` : ""}>${inner}</symbol>`;
}

/** XML forbids the literal sequence `--` anywhere inside a comment body
 * (only valid as the opening/closing delimiters) — asserts none of our own
 * comment text violates that, rather than silently emitting invalid XML
 * that only fails once a browser tries to parse it. */
function assertValidCommentText(text: string): string {
	if (text.includes("--")) {
		throw new Error(
			`comment text must not contain "--" (invalid inside an XML/SVG comment): ${text}`,
		);
	}
	return text;
}

export function generate(): string {
	const symbols = ICON_FILES.map(({ file, source }) => {
		const raw = nodeReadFileSync(join(ICONS_DIR, file));
		const id = `dtcg-ed-icon-${file.replace(/\.svg$/, "")}`;
		return `\n  <!-- ${assertValidCommentText(source)} -->\n  ${toSymbol(id, raw)}`;
	});

	const banner = assertValidCommentText(
		"GENERATED FILE, do not hand-edit. Regenerate via the web-app package's generate:icons script (also runs automatically before dev/build) after changing any file under assets/icons/, which remains the real source of truth (see assets/icons/NOTICE.md for full ISC License attribution text). Produced by scripts/generate-icon-sprite.ts.",
	);

	return `<!-- ${banner} -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
${symbols.join("\n")}
</svg>
`;
}

const invokedPath = process.argv[1];
if (
	invokedPath !== undefined &&
	import.meta.url === pathToFileURL(invokedPath).href
) {
	nodeWriteFileSync(OUTPUT_FILE, generate());
	console.log(`Wrote ${OUTPUT_FILE}`);
}
