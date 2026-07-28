import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveEffectiveType } from "./resolve-type.ts";
import type { GroupNode, TokenNode } from "./types.ts";

function group(name: string, declaredType: string | undefined): GroupNode {
	return {
		kind: "group",
		name,
		path: [name],
		declaredType,
		description: undefined,
		deprecated: undefined,
		extensions: {},
		children: new Map(),
	};
}

function token(name: string, declaredType: string | undefined): TokenNode {
	return {
		kind: "token",
		name,
		path: [name],
		value: "unused",
		declaredType,
		description: undefined,
		deprecated: undefined,
		extensions: {},
	};
}

test("uses the node's own declared type when present", () => {
	const node = token("red", "color");
	assert.equal(
		resolveEffectiveType(node, [group("colors", "dimension")]),
		"color",
	);
});

test("inherits from the nearest ancestor group with a declared type", () => {
	const node = token("small", undefined);
	const ancestors = [group("root", "dimension"), group("spacing", undefined)];
	assert.equal(resolveEffectiveType(node, ancestors), "dimension");
});

test("prefers the closest ancestor over a further one", () => {
	const node = token("small", undefined);
	const ancestors = [group("root", "dimension"), group("spacing", "number")];
	assert.equal(resolveEffectiveType(node, ancestors), "number");
});

test("returns undefined when no type is declared anywhere in the chain", () => {
	const node = token("small", undefined);
	const ancestors = [group("root", undefined), group("spacing", undefined)];
	assert.equal(resolveEffectiveType(node, ancestors), undefined);
});
