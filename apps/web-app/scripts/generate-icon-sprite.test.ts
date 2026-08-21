import { expect, test } from "vitest";
import { generate } from "./generate-icon-sprite.ts";

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

test("generate() produces well-formed XML", () => {
	const svg = generate();
	expect(parseErrorText(svg)).toBeUndefined();
});

test("generate() defines a <symbol> for every DTCG token type plus a fallback", () => {
	const svg = generate();
	const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
	const ids = Array.from(doc.querySelectorAll("symbol")).map((el) =>
		el.getAttribute("id"),
	);

	expect(ids).toContain("dtcg-ed-icon-color");
	expect(ids).toContain("dtcg-ed-icon-fallback");
	expect(new Set(ids).size).toBe(ids.length);
});

test("every <symbol> inherits stroke/fill presentation attributes (not just id/viewBox)", () => {
	const svg = generate();
	const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
	const symbols = Array.from(doc.querySelectorAll("symbol"));

	expect(symbols.length).toBeGreaterThan(0);
	for (const symbol of symbols) {
		expect(symbol.getAttribute("stroke")).toBe("currentColor");
	}
});
