/**
 * The `/tokens/<file>#<segment>.<segment>` addressing scheme (research.md
 * §4, contracts/token-addressing-and-navigation.md) — the finest
 * addressable unit before this feature was a whole file. Dots are safe as
 * segment separators *by specification*, not by convention: the DTCG
 * format forbids `.`, `{`, `}` in token and group names, the same
 * guarantee `pathKey = path.join(".")` helpers elsewhere already rely on.
 */

/**
 * Encodes a file's relative path into its `/tokens/...` route. Originally
 * `FolderOverview.tsx`'s own private `hrefFor` — moved here so the
 * addressing scheme's file half and token half share one encoding, per
 * this feature's navigation contract; `FolderOverview.tsx` now imports it.
 */
export function fileHref(relativePath: string): string {
	return `/tokens/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Encodes a token's path into a fragment (without the leading `#`). */
export function tokenFragment(path: readonly string[]): string {
	return path.map(encodeURIComponent).join(".");
}

/** The full href for a token: its file's route plus its fragment. */
export function tokenHref(
	relativePath: string,
	path: readonly string[],
): string {
	return `${fileHref(relativePath)}#${tokenFragment(path)}`;
}

function decodeSegment(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		// A malformed percent-encoding (e.g. a hand-edited URL) is treated the
		// same as any other fragment that fails to address a real token: the
		// caller looks it up, finds nothing, and ignores it — the page still
		// renders normally rather than throwing on a bad URL.
		return segment;
	}
}

/**
 * Decodes a fragment (with or without its leading `#`) back into path
 * segments. Returns an empty array for an empty or absent fragment — the
 * caller treats that as "no token addressed", not an error.
 */
export function decodeTokenFragment(fragment: string): readonly string[] {
	const body = fragment.startsWith("#") ? fragment.slice(1) : fragment;
	if (body.length === 0) {
		return [];
	}
	return body.split(".").map(decodeSegment);
}

/**
 * Whether `href` (as found on a rendered `<a>`, e.g. from `tokenHref`)
 * addresses the same file as `currentRelativePath` — a same-file fragment
 * jump, not a cross-file navigation. Used by the unsaved-edits guard
 * (contracts/token-addressing-and-navigation.md) to decide whether a click
 * needs intercepting at all: comparing against `fileHref` of the known
 * current file avoids re-parsing `href` back into a path.
 */
export function isSameFileHref(
	href: string,
	currentRelativePath: string,
): boolean {
	const currentFileHref = fileHref(currentRelativePath);
	return href === currentFileHref || href.startsWith(`${currentFileHref}#`);
}
