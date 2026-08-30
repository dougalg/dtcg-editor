import assert from "node:assert/strict";
import { test } from "vitest";
import type { PlainDtcgNode } from "./plain-node.ts";
import { StagedEditsStore } from "./staged-edits-store.ts";

function group(name: string, children: PlainDtcgNode[]): PlainDtcgNode {
	return {
		kind: "group",
		name,
		path: name === "" ? [] : [name],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children,
	};
}

function dimensionToken(
	path: readonly string[],
	value: unknown,
): PlainDtcgNode {
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

function makeStore(tree: PlainDtcgNode = group("", [])): StagedEditsStore {
	return new StagedEditsStore({
		initialTree: tree,
		referenceView: undefined,
		save: async () => true,
	});
}

test("StagedEditsStore read methods are bound and callable when destructured off the instance", () => {
	const store = makeStore();

	const { subscribe, getHasPending, getTree } = store;

	const unsubscribe = subscribe(() => {});
	assert.equal(typeof unsubscribe, "function");
	assert.equal(getHasPending(), false);
	assert.ok(getTree());
	unsubscribe();
});
