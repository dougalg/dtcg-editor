import assert from "node:assert/strict";
import { test } from "node:test";
import { collectReferences, parseReference } from "./reference.ts";

test("parses a whole-value reference", () => {
	const reference = parseReference("{color.brand.blue}");
	assert.deepEqual(reference, {
		targetPath: ["color", "brand", "blue"],
		at: [],
		raw: "{color.brand.blue}",
	});
});

test("parses a single-segment reference", () => {
	const reference = parseReference("{spacing}");
	assert.deepEqual(reference?.targetPath, ["spacing"]);
});

test("rejects a string that merely contains braces", () => {
	assert.equal(parseReference("a {b} c"), undefined);
});

test("rejects an empty body", () => {
	assert.equal(parseReference("{}"), undefined);
});

test("rejects a body containing a nested opening brace", () => {
	assert.equal(parseReference("{a.{b}"), undefined);
});

test("rejects a body containing a nested closing brace", () => {
	assert.equal(parseReference("{a.b}}"), undefined);
});

test("rejects a non-string value", () => {
	assert.equal(parseReference(42), undefined);
	assert.equal(parseReference(null), undefined);
	assert.equal(parseReference(undefined), undefined);
	assert.equal(parseReference({ colorSpace: "srgb" }), undefined);
});

test("rejects a plain literal string", () => {
	assert.equal(parseReference("#rrggbb"), undefined);
});

test("collectReferences finds a whole-value reference at the root", () => {
	const refs = collectReferences("{color.brand.blue}");
	assert.equal(refs.length, 1);
	assert.deepEqual(refs[0]?.at, []);
	assert.deepEqual(refs[0]?.targetPath, ["color", "brand", "blue"]);
});

test("collectReferences finds a reference nested inside a composite object value", () => {
	const value = {
		colorSpace: "srgb",
		components: [0, 0, 0],
		hex: "{color.legacy.hex}",
	};
	const refs = collectReferences(value);
	assert.equal(refs.length, 1);
	assert.deepEqual(refs[0]?.at, ["hex"]);
	assert.deepEqual(refs[0]?.targetPath, ["color", "legacy", "hex"]);
});

test("collectReferences finds a reference nested inside an array of composite layers (e.g. shadow)", () => {
	const value = [
		{ color: "{color.shadow.outer}", offsetX: { value: 0, unit: "px" } },
		{ color: "{color.shadow.inner}", offsetX: { value: 1, unit: "px" } },
	];
	const refs = collectReferences(value);
	assert.equal(refs.length, 2);
	assert.deepEqual(
		refs.map((r) => r.at),
		[
			[0, "color"],
			[1, "color"],
		],
	);
	assert.deepEqual(
		refs.map((r) => r.targetPath),
		[
			["color", "shadow", "outer"],
			["color", "shadow", "inner"],
		],
	);
});

test("collectReferences returns an empty array for a fully literal value", () => {
	const value = { colorSpace: "srgb", components: [0.1, 0.2, 0.3] };
	assert.deepEqual(collectReferences(value), []);
});

test("collectReferences returns an empty array for a plain literal string", () => {
	assert.deepEqual(collectReferences("#1f75cb"), []);
});

test("collectReferences does not descend into a reference string itself", () => {
	// A reference is a whole string, so there is nothing further inside it to
	// walk — this asserts that behavior rather than assuming it.
	const refs = collectReferences({ hex: "{color.a.b}" });
	assert.equal(refs.length, 1);
});
