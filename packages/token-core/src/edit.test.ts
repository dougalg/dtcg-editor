import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTokenEdits, TokenEditError } from "./edit.ts";
import { parseTokenFile } from "./parse.ts";
import { serializeTokenFile } from "./serialize.ts";
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

test("renames a group, updating its key and every descendant's path (AC-03)", () => {
	const result = applyTokenEdits(document(), [
		{ path: ["spacing"], name: "gaps" },
	]);
	if (!result.isOk()) {
		assert.fail("expected applyTokenEdits to succeed");
	}

	assert.equal(result.value.root.children.has("spacing"), false);
	const gaps = result.value.root.children.get("gaps") as GroupNode;
	assert.equal(gaps.name, "gaps");
	assert.deepEqual(gaps.path, ["gaps"]);

	const small = gaps.children.get("small") as TokenNode;
	assert.equal(small.name, "small");
	assert.deepEqual(small.path, ["gaps", "small"]);
	const large = gaps.children.get("large") as TokenNode;
	assert.deepEqual(large.path, ["gaps", "large"]);
});

test("rejects a group rename that collides with an existing sibling group", () => {
	const raw = JSON.stringify({
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
		},
		gaps: { small: { $type: "dimension", $value: { value: 4, unit: "px" } } },
	});
	const parsed = parseTokenFile(raw);
	if (!parsed.isOk()) {
		assert.fail("expected parseTokenFile to succeed");
	}

	const result = applyTokenEdits(parsed.value, [
		{ path: ["spacing"], name: "gaps" },
	]);
	assert.ok(result.isErr());
	assert.ok(result.error instanceof TokenEditError);
});

test("rejects a group rename that collides with an existing sibling token", () => {
	const raw = JSON.stringify({
		spacing: {},
		small: { $type: "dimension", $value: { value: 4, unit: "px" } },
	});
	const parsed = parseTokenFile(raw);
	if (!parsed.isOk()) {
		assert.fail("expected parseTokenFile to succeed");
	}

	const result = applyTokenEdits(parsed.value, [
		{ path: ["spacing"], name: "small" },
	]);
	assert.ok(result.isErr());
	assert.ok(result.error instanceof TokenEditError);
});

test("rejects setting value or description on a group edit", () => {
	const valueResult = applyTokenEdits(document(), [
		{ path: ["spacing"], value: { value: 1, unit: "px" } },
	]);
	assert.ok(valueResult.isErr());
	assert.ok(valueResult.error instanceof TokenEditError);

	const descriptionResult = applyTokenEdits(document(), [
		{ path: ["spacing"], description: "nope" },
	]);
	assert.ok(descriptionResult.isErr());
	assert.ok(descriptionResult.error instanceof TokenEditError);
});

test("applies a descendant edit and its ancestor's group rename correctly when the descendant edit is listed first (AC-04)", () => {
	const result = applyTokenEdits(document(), [
		{ path: ["spacing", "small"], name: "tiny" },
		{ path: ["spacing"], name: "gaps" },
	]);
	if (!result.isOk()) {
		assert.fail("expected applyTokenEdits to succeed");
	}

	const gaps = result.value.root.children.get("gaps") as GroupNode;
	const tiny = gaps.children.get("tiny") as TokenNode;
	assert.deepEqual(tiny.path, ["gaps", "tiny"]);
});

test("applies the same batch correctly even when the ancestor group rename is listed first (AC-04)", () => {
	const result = applyTokenEdits(document(), [
		{ path: ["spacing"], name: "gaps" },
		{ path: ["spacing", "small"], name: "tiny" },
	]);
	if (!result.isOk()) {
		assert.fail("expected applyTokenEdits to succeed");
	}

	const gaps = result.value.root.children.get("gaps") as GroupNode;
	const tiny = gaps.children.get("tiny") as TokenNode;
	assert.deepEqual(tiny.path, ["gaps", "tiny"]);
});

test("keeps same-depth edits in their original relative order after the depth sort", () => {
	// Renaming "large" away first frees up "large" for "small" to claim in
	// the same batch — this must not depend on array order beyond depth.
	const result = applyTokenEdits(document(), [
		{ path: ["spacing", "large"], name: "big" },
		{ path: ["spacing", "small"], name: "large" },
	]);
	if (!result.isOk()) {
		assert.fail("expected applyTokenEdits to succeed");
	}

	const spacing = result.value.root.children.get("spacing") as GroupNode;
	assert.equal(spacing.children.has("small"), false);
	assert.ok(spacing.children.has("big"));
	assert.ok(spacing.children.has("large"));
});

test("round-trips a group rename: parse -> serialize -> re-parse preserves all data (AC-08)", () => {
	const result = applyTokenEdits(document(), [
		{ path: ["spacing"], name: "gaps" },
	]);
	if (!result.isOk()) {
		assert.fail("expected applyTokenEdits to succeed");
	}

	const serialized = serializeTokenFile(result.value);
	if (!serialized.isOk()) {
		assert.fail("expected serializeTokenFile to succeed");
	}

	const reparsed = parseTokenFile(serialized.value);
	if (!reparsed.isOk()) {
		assert.fail("expected re-parse to succeed");
	}

	const gaps = reparsed.value.root.children.get("gaps") as GroupNode;
	assert.equal(gaps.children.size, 2);
	const small = gaps.children.get("small") as TokenNode;
	assert.deepEqual(small.value, { value: 4, unit: "px" });
	const large = gaps.children.get("large") as TokenNode;
	assert.deepEqual(large.value, { value: 16, unit: "px" });
});
