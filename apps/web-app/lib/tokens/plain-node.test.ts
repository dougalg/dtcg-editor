import assert from "node:assert/strict";
import { parseTokenFile } from "@dtcg-editor/token-core";
import { test } from "vitest";
import type { PlainDtcgNode } from "./plain-node.ts";
import { toPlainNode } from "./plain-node.ts";

function parse(json: unknown) {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) {
		throw new Error(`test fixture failed to parse: ${result.error.message}`);
	}
	return result.value;
}

function asGroup(node: PlainDtcgNode | undefined) {
	if (node === undefined || node.kind !== "group") {
		throw new Error("expected a group node");
	}
	return node;
}

test("toPlainNode carries effectiveType straight from token-core's materialized field", () => {
	const document = parse({
		spacing: {
			$type: "dimension",
			small: { $value: { value: 4, unit: "px" } },
		},
	});
	const plain = asGroup(toPlainNode(document.root));
	const spacing = asGroup(plain.children.find((c) => c.name === "spacing"));
	const small = spacing.children[0];
	assert.ok(small && small.kind === "token");
	assert.equal(small.effectiveType, "dimension");
	assert.equal(small.declaredType, undefined);
});

test("toPlainNode carries inferredType for an undeclared-type token with an unambiguous value", () => {
	const document = parse({
		color: {
			swatch: { $value: { colorSpace: "srgb", components: [0, 0, 0] } },
		},
	});
	const plain = asGroup(toPlainNode(document.root));
	const colorGroup = asGroup(plain.children.find((c) => c.name === "color"));
	const swatch = colorGroup.children[0];
	assert.ok(swatch && swatch.kind === "token");
	assert.equal(swatch.inferredType, "color");
	assert.equal(swatch.effectiveType, "color");
});

test("toPlainNode reports deprecated inherited from an ancestor group, not just the token's own declaration (T026 behavior change)", () => {
	const document = parse({
		color: {
			$deprecated: "legacy palette",
			red: { $type: "color", $value: "#ff0000" },
		},
	});
	const plain = asGroup(toPlainNode(document.root));
	const colorGroup = asGroup(plain.children.find((c) => c.name === "color"));
	assert.equal(colorGroup.deprecated, "legacy palette");
	const red = colorGroup.children[0];
	assert.ok(red?.kind === "token");
	assert.equal(red.deprecated, "legacy palette");
});

test("toPlainNode reports a token's own deprecated declaration overriding its ancestor's", () => {
	const document = parse({
		color: {
			$deprecated: "legacy palette",
			red: { $type: "color", $value: "#ff0000", $deprecated: false },
		},
	});
	const plain = asGroup(toPlainNode(document.root));
	const colorGroup = asGroup(plain.children.find((c) => c.name === "color"));
	const red = colorGroup.children[0];
	assert.ok(red && red.kind === "token");
	assert.equal(red.deprecated, false);
});
