import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveEffectiveDocument } from "./resolve-effective.ts";
import type { GroupNode, TokenDocument, TokenNode } from "./types.ts";

function token(overrides: Partial<TokenNode> = {}): TokenNode {
	return {
		kind: "token",
		name: "t",
		path: ["t"],
		value: { colorSpace: "srgb", components: [0, 0, 0] },
		declaredType: undefined,
		description: undefined,
		deprecated: undefined,
		extensions: {},
		effectiveType: undefined,
		effectiveDeprecated: undefined,
		inferredType: undefined,
		...overrides,
	};
}

function group(overrides: Partial<GroupNode> = {}): GroupNode {
	return {
		kind: "group",
		name: "",
		path: [],
		declaredType: undefined,
		description: undefined,
		deprecated: undefined,
		extensions: {},
		children: new Map(),
		effectiveType: undefined,
		effectiveDeprecated: undefined,
		...overrides,
	};
}

function doc(root: GroupNode): TokenDocument {
	return { root };
}

test("a token with an unambiguous inferable value and no declared type gets effectiveType/inferredType set", () => {
	const root = group({
		children: new Map([["color", token({ path: ["color"] })]]),
	});
	const resolved = resolveEffectiveDocument(doc(root));
	const resolvedToken = resolved.root.children.get("color") as TokenNode;
	assert.equal(resolvedToken.effectiveType, "color");
	assert.equal(resolvedToken.inferredType, "color");
});

test("a token with an ambiguous/no-match value stays untyped", () => {
	const root = group({
		children: new Map([
			["mystery", token({ path: ["mystery"], value: { nonsense: true } })],
		]),
	});
	const resolved = resolveEffectiveDocument(doc(root));
	const resolvedToken = resolved.root.children.get("mystery") as TokenNode;
	assert.equal(resolvedToken.effectiveType, undefined);
	assert.equal(resolvedToken.inferredType, undefined);
});

test("an explicitly declared type is never overridden by inference, and inferredType stays undefined", () => {
	const root = group({
		children: new Map([
			[
				"dim",
				token({
					path: ["dim"],
					declaredType: "dimension",
					value: { colorSpace: "srgb", components: [0, 0, 0] },
				}),
			],
		]),
	});
	const resolved = resolveEffectiveDocument(doc(root));
	const resolvedToken = resolved.root.children.get("dim") as TokenNode;
	assert.equal(resolvedToken.effectiveType, "dimension");
	assert.equal(resolvedToken.inferredType, undefined);
});

test("a token under an ancestor-declared type has effectiveType but no inferredType (nothing to suggest)", () => {
	const root = group({
		declaredType: "color",
		children: new Map([["c", token({ path: ["c"] })]]),
	});
	const resolved = resolveEffectiveDocument(doc(root));
	const resolvedToken = resolved.root.children.get("c") as TokenNode;
	assert.equal(resolvedToken.effectiveType, "color");
	assert.equal(resolvedToken.inferredType, undefined);
});

test("a group's own effectiveType resolves from declaration/inheritance only, never inference", () => {
	const root = group({
		children: new Map([
			[
				"nested",
				group({ path: ["nested"], name: "nested", children: new Map() }),
			],
		]),
	});
	const resolved = resolveEffectiveDocument(doc(root));
	const nested = resolved.root.children.get("nested") as GroupNode;
	assert.equal(nested.effectiveType, undefined);
});

test("a token under a deprecated ancestor group resolves effectiveDeprecated to the ancestor's value", () => {
	const root = group({
		deprecated: "use something else",
		children: new Map([["c", token({ path: ["c"] })]]),
	});
	const resolved = resolveEffectiveDocument(doc(root));
	const resolvedToken = resolved.root.children.get("c") as TokenNode;
	assert.equal(resolvedToken.effectiveDeprecated, "use something else");
});

test("a token's own deprecated declaration overrides an ancestor's", () => {
	const root = group({
		deprecated: "group-level",
		children: new Map([["c", token({ path: ["c"], deprecated: true })]]),
	});
	const resolved = resolveEffectiveDocument(doc(root));
	const resolvedToken = resolved.root.children.get("c") as TokenNode;
	assert.equal(resolvedToken.effectiveDeprecated, true);
});
