import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTokenFile, TokenParseError } from "./parse.ts";
import type { GroupNode, TokenNode } from "./types.ts";

test("parses a simple valid token file", () => {
	const raw = JSON.stringify({
		color: {
			red: { $type: "color", $value: "#ff0000", $description: "Brand red" },
		},
	});

	const result = parseTokenFile(raw);
	if (!result.isOk()) {
		assert.fail("expected parseTokenFile to succeed");
	}

	assert.equal(result.value.root.kind, "group");
	const colorGroup = result.value.root.children.get("color");
	assert.ok(colorGroup && colorGroup.kind === "group");
	const red = colorGroup.children.get("red") as TokenNode;
	assert.equal(red.kind, "token");
	assert.equal(red.value, "#ff0000");
	assert.equal(red.declaredType, "color");
	assert.equal(red.description, "Brand red");
});

test("parses nested groups with an inherited $type declared on an ancestor", () => {
	const raw = JSON.stringify({
		spacing: {
			$type: "dimension",
			small: { $value: "4px" },
			large: { $value: "16px", $type: "dimension" },
		},
	});

	const result = parseTokenFile(raw);
	if (!result.isOk()) {
		assert.fail("expected parseTokenFile to succeed");
	}

	const spacingGroup = result.value.root.children.get("spacing") as GroupNode;
	assert.equal(spacingGroup.declaredType, "dimension");

	const small = spacingGroup.children.get("small") as TokenNode;
	assert.equal(small.declaredType, undefined);

	const large = spacingGroup.children.get("large") as TokenNode;
	assert.equal(large.declaredType, "dimension");
});

test("preserves unrecognized $-prefixed fields as extensions, including $extensions itself", () => {
	const raw = JSON.stringify({
		color: {
			red: {
				$type: "color",
				$value: "#ff0000",
				$extensions: { "com.example.tool": { foo: "bar" } },
				$customField: 42,
			},
		},
	});

	const result = parseTokenFile(raw);
	if (!result.isOk()) {
		assert.fail("expected parseTokenFile to succeed");
	}

	const colorGroup = result.value.root.children.get("color") as GroupNode;
	const red = colorGroup.children.get("red") as TokenNode;

	assert.deepEqual(red.extensions.$extensions, {
		"com.example.tool": { foo: "bar" },
	});
	assert.equal(red.extensions.$customField, 42);
});

test("returns TokenParseError on invalid JSON", () => {
	const result = parseTokenFile("{not valid json");
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof TokenParseError);
	}
});

test("returns TokenParseError when a token node mixes $value with child keys", () => {
	const raw = JSON.stringify({
		color: {
			$value: "#ff0000",
			red: { $value: "#ff0000" },
		},
	});

	const result = parseTokenFile(raw);
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof TokenParseError);
	}
});

test("returns TokenParseError when $type is not a string", () => {
	const raw = JSON.stringify({
		color: {
			red: { $type: 123, $value: "#ff0000" },
		},
	});

	const result = parseTokenFile(raw);
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof TokenParseError);
	}
});

test("returns TokenParseError when the input is not a string", () => {
	const result = parseTokenFile({ not: "a string" });
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof TokenParseError);
	}
});
