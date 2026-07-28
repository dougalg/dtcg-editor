import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTokenEdits, TokenEditError } from "./edit.ts";
import { parseTokenFile } from "./parse.ts";
import type { GroupNode, TokenNode } from "./types.ts";

function document() {
	const raw = JSON.stringify({
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
			large: { $type: "dimension", $value: { value: 16, unit: "px" } },
		},
	});
	const result = parseTokenFile(raw);
	if (!result.isOk()) {
		assert.fail("expected parseTokenFile to succeed");
	}
	return result.value;
}

test("renames a token", () => {
	const result = applyTokenEdits(document(), [
		{ path: ["spacing", "small"], name: "tiny" },
	]);
	if (!result.isOk()) {
		assert.fail("expected applyTokenEdits to succeed");
	}

	const spacing = result.value.root.children.get("spacing") as GroupNode;
	assert.equal(spacing.children.has("small"), false);
	const renamed = spacing.children.get("tiny") as TokenNode;
	assert.equal(renamed.name, "tiny");
	assert.deepEqual(renamed.path, ["spacing", "tiny"]);
});

test("rejects a rename that collides with an existing sibling", () => {
	const result = applyTokenEdits(document(), [
		{ path: ["spacing", "small"], name: "large" },
	]);
	assert.ok(result.isErr());
	assert.ok(result.error instanceof TokenEditError);
});

test("patches value and description", () => {
	const result = applyTokenEdits(document(), [
		{
			path: ["spacing", "small"],
			value: { value: 8, unit: "px" },
			description: "Updated",
		},
	]);
	if (!result.isOk()) {
		assert.fail("expected applyTokenEdits to succeed");
	}

	const spacing = result.value.root.children.get("spacing") as GroupNode;
	const small = spacing.children.get("small") as TokenNode;
	assert.deepEqual(small.value, { value: 8, unit: "px" });
	assert.equal(small.description, "Updated");
});

test("returns a TokenEditError for a nonexistent path", () => {
	const result = applyTokenEdits(document(), [
		{ path: ["spacing", "missing"], value: { value: 1, unit: "px" } },
	]);
	assert.ok(result.isErr());
	assert.ok(result.error instanceof TokenEditError);
});

test("returns a TokenEditError when the path points at a group, not a token", () => {
	const result = applyTokenEdits(document(), [
		{ path: ["spacing"], value: { value: 1, unit: "px" } },
	]);
	assert.ok(result.isErr());
	assert.ok(result.error instanceof TokenEditError);
});
