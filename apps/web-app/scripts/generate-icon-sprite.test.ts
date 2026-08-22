import { expect, test } from "vitest";
import {
	discoverSpriteNames,
	generateAll,
	generateSprite,
} from "./generate-icon-sprite.ts";

/**
 * `DOMParser` comes from this test's jsdom environment (see
 * `vitest.config.ts`'s "unit" project) — not a new dependency. Parsing as
 * `image/svg+xml` surfaces a `<parsererror>` node for malformed XML exactly
 * like a browser does, which is what actually broke `public/icon-sprite.svg`
 * previously (a generated comment contained the literal sequence "--",
 * invalid inside an XML comment body) — `next build`'s TypeScript/bundling
 * checks never catch this, since the sprite is a plain string until a
 * browser actually parses it as XML.
 */
function parseErrorText(svg: string): string | undefined {
	const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
	return doc.querySelector("parsererror")?.textContent ?? undefined;
}

test("discoverSpriteNames() finds both sprite folders", () => {
	expect(discoverSpriteNames()).toEqual(["theme", "token-types"]);
});

test("generateAll() produces one well-formed sprite per folder", () => {
	const results = generateAll();
	expect(results).toHaveLength(2);
	for (const result of results) {
		expect(parseErrorText(result.svg)).toBeUndefined();
	}
});

test("token-types sprite defines a <symbol> for every DTCG token type plus a fallback", () => {
	const { svg, idsBySourceName } = generateSprite("token-types");
	const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
	const ids = Array.from(doc.querySelectorAll("symbol")).map((el) =>
		el.getAttribute("id"),
	);

	expect(ids).toContain("dtcg-ed-icon-color");
	expect(ids).toContain("dtcg-ed-icon-fallback");
	expect(new Set(ids).size).toBe(ids.length);
	expect(idsBySourceName.color).toBe("dtcg-ed-icon-color");
	expect(idsBySourceName.fallback).toBe("dtcg-ed-icon-fallback");
});

test("theme sprite defines a <symbol> for sun and moon", () => {
	const { svg, idsBySourceName } = generateSprite("theme");
	const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
	const ids = Array.from(doc.querySelectorAll("symbol")).map((el) =>
		el.getAttribute("id"),
	);

	expect(ids).toEqual(
		expect.arrayContaining(["dtcg-ed-icon-sun", "dtcg-ed-icon-moon"]),
	);
	expect(idsBySourceName.sun).toBe("dtcg-ed-icon-sun");
	expect(idsBySourceName.moon).toBe("dtcg-ed-icon-moon");
});

test("every <symbol> in every sprite inherits stroke/fill presentation attributes (not just id/viewBox)", () => {
	for (const { svg } of generateAll()) {
		const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
		const symbols = Array.from(doc.querySelectorAll("symbol"));

		expect(symbols.length).toBeGreaterThan(0);
		for (const symbol of symbols) {
			expect(symbol.getAttribute("stroke")).toBe("currentColor");
		}
	}
});
