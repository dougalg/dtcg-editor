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

test("getFields returns a token's base fields, and the same object on repeated reads", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);

	const fields = store.getFields("space.sm");
	assert.deepEqual(fields, {
		name: "sm",
		value: { value: 4, unit: "px" },
		description: "",
		type: "dimension",
	});
	assert.equal(store.getFields("space.sm"), fields);
});

test("commit renaming a token onto a sibling's name is rejected with a name error", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
				dimensionToken(["space", "lg"], { value: 16, unit: "px" }),
			]),
		]),
	);

	const ok = store.commit("space.sm", { name: "lg" });

	assert.equal(ok, false);
	assert.ok(store.getError("space.sm")?.name);
	assert.equal(store.getHasPending(), false);
});

test("successive commits to one key accumulate into a single staged edit", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);

	store.commit("space.sm", { description: "small spacing" });
	store.commit("space.sm", { value: { value: 8, unit: "px" } });

	const fields = store.getFields("space.sm");
	assert.equal(fields.description, "small spacing");
	assert.deepEqual(fields.value, { value: 8, unit: "px" });
});

test("commit with the token's current value stages nothing", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);

	const ok = store.commit("space.sm", { value: { value: 4, unit: "px" } });

	assert.equal(ok, true);
	assert.equal(store.getHasPending(), false);
	assert.equal(store.getError("space.sm"), undefined);
});

test("getHasPending reflects whether any edit is staged", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);

	assert.equal(store.getHasPending(), false);
	store.commit("space.sm", { value: { value: 8, unit: "px" } });
	assert.equal(store.getHasPending(), true);
});

test("commit with an invalid value is rejected: returns false, stages nothing, records an error", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);

	const ok = store.commit("space.sm", { value: "not-a-dimension" });

	assert.equal(ok, false);
	assert.deepEqual(store.getFields("space.sm").value, { value: 4, unit: "px" });
	assert.ok(store.getError("space.sm")?.value);
});

test("commit with a valid value overlays the drafted value on getFields", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);

	const ok = store.commit("space.sm", { value: { value: 8, unit: "px" } });

	assert.equal(ok, true);
	assert.deepEqual(store.getFields("space.sm").value, { value: 8, unit: "px" });
});

test("commit to one token leaves getFields identity unchanged for an untouched token", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
				dimensionToken(["space", "lg"], { value: 16, unit: "px" }),
			]),
		]),
	);

	const untouchedBefore = store.getFields("space.lg");
	store.commit("space.sm", { value: { value: 8, unit: "px" } });

	assert.equal(store.getFields("space.lg"), untouchedBefore);
});
