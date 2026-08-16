import assert from "node:assert/strict";
import { parseTokenFile, type TokenDocument } from "@dtcg-editor/token-core";
import { test } from "vitest";
import { isTokenDocumentStandard } from "./standard-type.ts";

function parse(raw: unknown): TokenDocument {
	const result = parseTokenFile(JSON.stringify(raw));
	if (!result.isOk()) {
		assert.fail("expected fixture document to parse");
	}
	return result.value;
}

test("an empty document is standard", () => {
	assert.equal(isTokenDocumentStandard(parse({})), true);
});

test("a document where every declared $type is recognized is standard", () => {
	const document = parse({
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
		},
		colors: {
			$type: "color",
			red: { $value: "#ff0000" },
		},
	});
	assert.equal(isTokenDocumentStandard(document), true);
});

test("a document with no declared $type anywhere is standard", () => {
	const document = parse({
		spacing: {
			small: { $value: { value: 4, unit: "px" } },
		},
	});
	assert.equal(isTokenDocumentStandard(document), true);
});

test("a token with an unrecognized declared $type is non-standard", () => {
	const document = parse({
		spacing: {
			small: { $type: "not-a-real-type", $value: "1" },
		},
	});
	assert.equal(isTokenDocumentStandard(document), false);
});

test("a group with an unrecognized declared $type is non-standard, even with no children", () => {
	const document = parse({
		weird: { $type: "not-a-real-type" },
	});
	assert.equal(isTokenDocumentStandard(document), false);
});

test("a token inheriting a non-standard $type from an ancestor group does not itself count (only own declared $type matters)", () => {
	const document = parse({
		weird: {
			$type: "not-a-real-type",
			child: { $value: "1" },
		},
	});
	// The group itself declares the unrecognized type, so the document is
	// still non-standard overall — but via the group's own declaration, not
	// the child's (the child declares no $type of its own at all).
	assert.equal(isTokenDocumentStandard(document), false);
});
