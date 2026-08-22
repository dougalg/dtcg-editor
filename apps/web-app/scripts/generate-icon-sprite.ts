import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	type DirEntry,
	nodeMkdirSync,
	nodeReaddirSync,
	nodeReadFileSync,
	nodeWriteFileSync,
} from "../lib/platform/node-fs.ts";

/**
 * Regenerates one `public/<sprite-name>-sprite.svg` plus one
 * `assets/generated/<sprite-name>-sprite.ids.ts` per subfolder of
 * `assets/icons/` (the actual, hand-edited source of truth — see each
 * subfolder's own `NOTICE.md` for attribution). Every sprite is a real
 * static asset, served by Next.js at `/<sprite-name>-sprite.svg` and
 * referenced from components via `<use href="/<sprite-name>-sprite.svg#...">`
 * — not inlined into the JS bundle. Confirmed (Chromium, via a standalone
 * Playwright check) that `currentColor` on the referencing `<svg>`/`<use>`
 * correctly resolves inside a cross-document `<use>` reference, so this
 * loses no theming versus an inlined sprite.
 *
 * No sprite name, folder name, or icon file name is hardcoded here — this
 * script discovers every subfolder of `assets/icons/` and every `.svg` file
 * within it at run time, so adding a new folder or a new icon file requires
 * no change to this script, only a re-run of `pnpm generate:icons` (already
 * a prerequisite of `dev`/`build`/`test`, see package.json).
 */

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(SCRIPT_DIR, "../assets/icons");
const PUBLIC_DIR = join(SCRIPT_DIR, "../public");
const GENERATED_DIR = join(SCRIPT_DIR, "../assets/generated");

export interface SpriteResult {
	readonly spriteName: string;
	readonly svg: string;
	/** Source `.svg` basename (no extension) -> its `<symbol id>`. */
	readonly idsBySourceName: Record<string, string>;
}

/**
 * Turns one standalone `<svg ...>...</svg>` file's raw markup into a
 * `<symbol>` with a stable id (its filename, minus `.svg`, prefixed —
 * `dtcg-ed-icon-<basename>`), carrying over every presentation attribute
 * from the source `<svg>` tag (`fill`, `stroke`, `stroke-width`,
 * `stroke-linecap`, `stroke-linejoin`, ...) except `xmlns` — `<symbol>`
 * doesn't take one, and dropping it is harmless since the sprite's own
 * outer `<svg>` already declares the namespace once. Dropping those
 * attributes was an earlier bug here: with only `id`/`viewBox` kept, every
 * inner `<path>`/`<circle>` fell back to SVG's own defaults (`fill: black`,
 * `stroke: none`) instead of inheriting `stroke="currentColor"` — and since
 * most of these icons are stroke-only line art with zero fill-area, that
 * made them render as literally nothing, not merely the wrong color.
 * Regex-based, not full XML parsing — safe here because every input is a
 * file this repo owns and controls (see `assets/icons/`), not third-party
 * or user-supplied SVG.
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

function svgFileNames(entries: DirEntry[]): string[] {
	return entries
		.filter((entry) => entry.isFile() && entry.name.endsWith(".svg"))
		.map((entry) => entry.name)
		.sort();
}

/** Every subfolder of `assets/icons/` — one sprite per folder. */
export function discoverSpriteNames(
	iconsDir: string = ICONS_DIR,
	readdirSync = nodeReaddirSync,
): string[] {
	return readdirSync(iconsDir)
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

export function generateSprite(
	spriteName: string,
	iconsDir: string = ICONS_DIR,
	readdirSync = nodeReaddirSync,
	readFileSync = nodeReadFileSync,
): SpriteResult {
	const spriteDir = join(iconsDir, spriteName);
	const fileNames = svgFileNames(readdirSync(spriteDir));
	const idsBySourceName: Record<string, string> = {};

	const symbols = fileNames.map((fileName) => {
		const basename = fileName.replace(/\.svg$/, "");
		const id = `dtcg-ed-icon-${basename}`;
		idsBySourceName[basename] = id;
		const raw = readFileSync(join(spriteDir, fileName));
		return `\n  ${toSymbol(id, raw)}`;
	});

	const banner = assertValidCommentText(
		`GENERATED FILE, do not hand-edit. Regenerate via the web-app package's generate:icons script (also runs automatically before dev/build) after changing any file under assets/icons/${spriteName}/, which remains the real source of truth (see that folder's NOTICE.md for attribution). Produced by scripts/generate-icon-sprite.ts.`,
	);

	const svg = `<!-- ${banner} -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
${symbols.join("\n")}
</svg>
`;

	return { spriteName, svg, idsBySourceName };
}

export function generateAll(
	iconsDir: string = ICONS_DIR,
	readdirSync = nodeReaddirSync,
	readFileSync = nodeReadFileSync,
): SpriteResult[] {
	return discoverSpriteNames(iconsDir, readdirSync).map((spriteName) =>
		generateSprite(spriteName, iconsDir, readdirSync, readFileSync),
	);
}

function toConstantName(spriteName: string): string {
	return `${spriteName.replace(/-/g, "_").toUpperCase()}_SPRITE_ICON_IDS`;
}

function idsModuleSource(result: SpriteResult): string {
	const banner = assertValidCommentText(
		`GENERATED FILE, do not hand-edit. Maps each assets/icons/${result.spriteName}/*.svg basename to its <symbol id> in public/${result.spriteName}-sprite.svg. Regenerate via the web-app package's generate:icons script. Produced by scripts/generate-icon-sprite.ts.`,
	);
	const entries = Object.entries(result.idsBySourceName)
		.map(([name, id]) => `\t${JSON.stringify(name)}: ${JSON.stringify(id)},`)
		.join("\n");

	return `// ${banner}
export const ${toConstantName(result.spriteName)} = {
${entries}
} as const;
`;
}

const invokedPath = process.argv[1];
if (
	invokedPath !== undefined &&
	import.meta.url === pathToFileURL(invokedPath).href
) {
	nodeMkdirSync(PUBLIC_DIR);
	nodeMkdirSync(GENERATED_DIR);
	for (const result of generateAll()) {
		const spriteFile = join(PUBLIC_DIR, `${result.spriteName}-sprite.svg`);
		nodeWriteFileSync(spriteFile, result.svg);
		console.log(`Wrote ${spriteFile}`);

		const idsFile = join(GENERATED_DIR, `${result.spriteName}-sprite.ids.ts`);
		nodeWriteFileSync(idsFile, idsModuleSource(result));
		console.log(`Wrote ${idsFile}`);
	}
}
