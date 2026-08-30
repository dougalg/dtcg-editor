import assert from "node:assert/strict";
import { test } from "vitest";
import type { PlainDtcgNode } from "./plain-node.ts";
import { type ResolvedValue, resolvePreview } from "./preview-resolver.ts";

function token(path: readonly string[], value: unknown): PlainDtcgNode {
	return {
		kind: "token",
		name: path[path.length - 1] ?? "",
		path,
		value,
		declaredType: "dimension",
		effectiveType: "dimension",
		inferredType: undefined,
		description: undefined,
		deprecated: undefined,
	};
}

/** Build a `getEffectiveNode` from a flat `{ pathKey: node }` map. */
function nodesByKey(
	entries: Record<string, PlainDtcgNode>,
): (key: string) => PlainDtcgNode | undefined {
	return (key) => entries[key];
}

const NO_SERVER_PREVIEW = new Map<string, ResolvedValue>();

test("resolvePreview reflects the current effective value each call, with no stale carry-over", () => {
	// b -> {a}, a holds a literal.
	const beforeChange = nodesByKey({
		b: token(["b"], "{a}"),
		a: token(["a"], { value: 4, unit: "px" }),
	});
	assert.deepEqual(resolvePreview("b", beforeChange, NO_SERVER_PREVIEW), {
		kind: "value",
		value: { value: 4, unit: "px" },
		via: ["a"],
	});

	// a's value has since become a reference to x.
	const afterChange = nodesByKey({
		b: token(["b"], "{a}"),
		a: token(["a"], "{x}"),
		x: token(["x"], { value: 9, unit: "px" }),
	});
	assert.deepEqual(resolvePreview("b", afterChange, NO_SERVER_PREVIEW), {
		kind: "value",
		value: { value: 9, unit: "px" },
		via: ["a", "x"],
	});
});

test("resolvePreview returns a cycle marker for a reference loop, without looping", () => {
	const nodes = nodesByKey({
		a: token(["a"], "{b}"),
		b: token(["b"], "{a}"),
	});

	assert.deepEqual(resolvePreview("a", nodes, NO_SERVER_PREVIEW), {
		kind: "cycle",
		ref: "{a}",
	});
});

test("resolvePreview splices in the server value for a target outside the file", () => {
	const serverValue: ResolvedValue = {
		kind: "value",
		value: "#3366cc",
		via: [],
	};
	const server = new Map<string, ResolvedValue>([["base.color", serverValue]]);
	const nodes = nodesByKey({ x: token(["x"], "{base.color}") });

	assert.equal(resolvePreview("x", nodes, server), serverValue);
});

test("resolvePreview returns unresolved when a reference target is missing", () => {
	const nodes = nodesByKey({ b: token(["b"], "{missing.token}") });

	assert.deepEqual(resolvePreview("b", nodes, NO_SERVER_PREVIEW), {
		kind: "unresolved",
		ref: "{missing.token}",
	});
});

test("resolvePreview follows a multi-hop in-file chain to the final value", () => {
	const nodes = nodesByKey({
		a: token(["a"], { value: 4, unit: "px" }),
		b: token(["b"], "{a}"),
		c: token(["c"], "{b}"),
	});

	assert.deepEqual(resolvePreview("c", nodes, NO_SERVER_PREVIEW), {
		kind: "value",
		value: { value: 4, unit: "px" },
		via: ["b", "a"],
	});
});

test("resolvePreview returns a literal value with an empty via chain", () => {
	const nodes = nodesByKey({
		"space.sm": token(["space", "sm"], { value: 4, unit: "px" }),
	});

	const result = resolvePreview("space.sm", nodes, NO_SERVER_PREVIEW);

	assert.deepEqual(result, {
		kind: "value",
		value: { value: 4, unit: "px" },
		via: [],
	});
});
