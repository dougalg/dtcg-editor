import { test } from "vitest";
import assert from "node:assert/strict";
import { validateTokenValue } from "@dtcg-editor/token-type-contract";
import {
	applyEditsToPlainNode,
	checkRenameAvailable,
	findSiblings,
} from "./edit-state.ts";
import { resolveBuiltInContract } from "../token-editors/built-in.ts";
import type { PlainDtcgNode } from "./plain-node.ts";

function tokenNode(
	name: string,
	path: readonly string[],
	value: unknown,
): PlainDtcgNode {
	return {
		kind: "token",
		name,
		path,
		value,
		declaredType: "dimension",
		effectiveType: "dimension",
		description: undefined,
		deprecated: undefined,
	};
}

function tree(): PlainDtcgNode {
	return {
		kind: "group",
		name: "",
		path: [],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [
			{
				kind: "group",
				name: "spacing",
				path: ["spacing"],
				declaredType: undefined,
				effectiveType: undefined,
				description: undefined,
				deprecated: undefined,
				children: [
					tokenNode("small", ["spacing", "small"], { value: 4, unit: "px" }),
					tokenNode("large", ["spacing", "large"], { value: 16, unit: "px" }),
				],
			},
		],
	};
}

test("applyEditsToPlainNode patches a token's value", () => {
	const result = applyEditsToPlainNode(tree(), [
		{ path: ["spacing", "small"], value: { value: 8, unit: "px" } },
	]);
	const spacing = result.kind === "group" ? result.children[0] : undefined;
	const small = spacing?.kind === "group" ? spacing.children[0] : undefined;
	assert.ok(small?.kind === "token");
	assert.deepEqual(small.value, { value: 8, unit: "px" });
});

test("applyEditsToPlainNode renames a token and updates its path", () => {
	const result = applyEditsToPlainNode(tree(), [
		{ path: ["spacing", "small"], name: "tiny" },
	]);
	const spacing = result.kind === "group" ? result.children[0] : undefined;
	const renamed = spacing?.kind === "group" ? spacing.children[0] : undefined;
	assert.ok(renamed?.kind === "token");
	assert.equal(renamed.name, "tiny");
	assert.deepEqual(renamed.path, ["spacing", "tiny"]);
});

test("applyEditsToPlainNode leaves untouched siblings alone", () => {
	const result = applyEditsToPlainNode(tree(), [
		{ path: ["spacing", "small"], value: { value: 8, unit: "px" } },
	]);
	const spacing = result.kind === "group" ? result.children[0] : undefined;
	const large = spacing?.kind === "group" ? spacing.children[1] : undefined;
	assert.ok(large?.kind === "token");
	assert.deepEqual(large.value, { value: 16, unit: "px" });
});

test("checkRenameAvailable allows keeping the current name", () => {
	const siblings = [
		tokenNode("large", ["spacing", "large"], { value: 16, unit: "px" }),
	];
	assert.equal(checkRenameAvailable(siblings, "small", "small"), true);
});

test("checkRenameAvailable rejects a name already used by a sibling", () => {
	const siblings = [
		tokenNode("large", ["spacing", "large"], { value: 16, unit: "px" }),
	];
	assert.equal(checkRenameAvailable(siblings, "large", "small"), false);
});

test("checkRenameAvailable allows a name no sibling uses", () => {
	const siblings = [
		tokenNode("large", ["spacing", "large"], { value: 16, unit: "px" }),
	];
	assert.equal(checkRenameAvailable(siblings, "medium", "small"), true);
});

test("findSiblings returns the other children of the parent group, excluding the node itself", () => {
	const siblings = findSiblings(tree(), ["spacing", "small"]);
	assert.equal(siblings.length, 1);
	assert.ok(siblings.some((sibling) => sibling.name === "large"));
	assert.ok(!siblings.some((sibling) => sibling.name === "small"));
});

test("validateTokenValue accepts a valid dimension value via the generic dispatch path", () => {
	const contract = resolveBuiltInContract("dimension");
	assert.ok(contract !== undefined);
	const result = validateTokenValue(contract, { value: 4, unit: "px" });
	assert.equal(result.isOk(), true);
});

test("validateTokenValue rejects an invalid dimension value via the generic dispatch path", () => {
	const contract = resolveBuiltInContract("dimension");
	assert.ok(contract !== undefined);
	const result = validateTokenValue(contract, { value: 4 });
	assert.equal(result.isErr(), true);
});

test("applyEditsToPlainNode renames a group and cascades descendant paths", () => {
	const result = applyEditsToPlainNode(tree(), [
		{ path: ["spacing"], name: "gaps" },
	]);
	assert.ok(result.kind === "group");
	const gaps = result.children[0];
	assert.ok(gaps?.kind === "group");
	assert.equal(gaps.name, "gaps");
	assert.deepEqual(gaps.path, ["gaps"]);

	const small = gaps.children[0];
	assert.ok(small?.kind === "token");
	assert.deepEqual(small.path, ["gaps", "small"]);
	const large = gaps.children[1];
	assert.ok(large?.kind === "token");
	assert.deepEqual(large.path, ["gaps", "large"]);
});

test("applyEditsToPlainNode applies a group rename and a descendant edit together regardless of array order", () => {
	const renameFirst = applyEditsToPlainNode(tree(), [
		{ path: ["spacing"], name: "gaps" },
		{ path: ["spacing", "small"], name: "tiny" },
	]);
	const descendantFirst = applyEditsToPlainNode(tree(), [
		{ path: ["spacing", "small"], name: "tiny" },
		{ path: ["spacing"], name: "gaps" },
	]);

	for (const result of [renameFirst, descendantFirst]) {
		assert.ok(result.kind === "group");
		const gaps = result.children[0];
		assert.ok(gaps?.kind === "group");
		const tiny = gaps.children[0];
		assert.ok(tiny?.kind === "token");
		assert.deepEqual(tiny.path, ["gaps", "tiny"]);
	}
});

test("findSiblings includes both group and token siblings", () => {
	const spacingGroup: PlainDtcgNode = {
		kind: "group",
		name: "spacing",
		path: ["spacing"],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [
			tokenNode("small", ["spacing", "small"], { value: 4, unit: "px" }),
		],
	};
	const withSiblingGroup: PlainDtcgNode = {
		kind: "group",
		name: "",
		path: [],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [
			spacingGroup,
			{
				kind: "group",
				name: "colors",
				path: ["colors"],
				declaredType: undefined,
				effectiveType: undefined,
				description: undefined,
				deprecated: undefined,
				children: [],
			},
		],
	};

	const siblings = findSiblings(withSiblingGroup, ["spacing"]);
	assert.equal(siblings.length, 1);
	assert.equal(siblings[0]?.name, "colors");
});

test("checkRenameAvailable rejects a group rename colliding with a sibling token or group", () => {
	const groupSibling = tokenNode("colors", ["colors"], "unused");
	assert.equal(
		checkRenameAvailable([groupSibling], "colors", "spacing"),
		false,
	);
	assert.equal(
		checkRenameAvailable([groupSibling], "spacing", "spacing"),
		true,
	);
});
