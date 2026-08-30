import assert from "node:assert/strict";
import { test } from "vitest";
import type { ClientEdit } from "./edit-state.ts";
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

test("getResolvedPreview is cached across reads; save clears the whole preview cache", async () => {
	const store = new StagedEditsStore({
		initialTree: group("", [
			group("g", [
				dimensionToken(["g", "x"], { value: 1, unit: "px" }),
				dimensionToken(["g", "y"], { value: 2, unit: "px" }),
			]),
		]),
		referenceView: undefined,
		save: async () => true,
	});

	const yBefore = store.getResolvedPreview("g.y");
	assert.equal(store.getResolvedPreview("g.y"), yBefore);

	// An edit to an unrelated token leaves y's cached preview alone…
	store.commit("g.x", { value: { value: 9, unit: "px" } });
	assert.equal(store.getResolvedPreview("g.y"), yBefore);

	// …but a save rebuilds the base tree, so every cached preview is dropped.
	await store.save();
	assert.notEqual(store.getResolvedPreview("g.y"), yBefore);
});

test("commit invalidates the preview cache for only the edited key and its dependents", () => {
	const store = makeStore(
		group("", [
			group("g", [
				dimensionToken(["g", "a"], { value: 4, unit: "px" }),
				dimensionToken(["g", "b"], "{g.a}"),
				dimensionToken(["g", "c"], { value: 9, unit: "px" }),
			]),
		]),
	);
	const dependentBefore = store.getResolvedPreview("g.b");
	const independentBefore = store.getResolvedPreview("g.c");

	store.commit("g.a", { value: { value: 8, unit: "px" } });

	assert.notEqual(store.getResolvedPreview("g.b"), dependentBefore);
	assert.equal(store.getResolvedPreview("g.c"), independentBefore);
});

test("getResolvedPreview resolves a reference over the committed overlay, not the base", () => {
	const store = makeStore(
		group("", [
			group("g", [
				dimensionToken(["g", "a"], { value: 4, unit: "px" }),
				dimensionToken(["g", "b"], "{g.a}"),
			]),
		]),
	);

	assert.deepEqual(store.getResolvedPreview("g.b"), {
		kind: "value",
		value: { value: 4, unit: "px" },
		via: ["g.a"],
	});

	store.commit("g.a", { value: { value: 8, unit: "px" } });

	assert.deepEqual(store.getResolvedPreview("g.b"), {
		kind: "value",
		value: { value: 8, unit: "px" },
		via: ["g.a"],
	});
});

test("discard and reportError also notify subscribers", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);
	let notifications = 0;
	store.subscribe(() => {
		notifications++;
	});

	store.reportError("space.sm", { name: undefined, value: "bad" });
	assert.equal(notifications, 1);

	store.discard("space.sm");
	assert.equal(notifications, 2);
});

test("the store notifies subscribers after a state-changing commit and after save", async () => {
	const store = new StagedEditsStore({
		initialTree: group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
		referenceView: undefined,
		save: async () => true,
	});
	let notifications = 0;
	const unsubscribe = store.subscribe(() => {
		notifications++;
	});

	store.commit("space.sm", { value: { value: 8, unit: "px" } });
	assert.equal(notifications, 1);

	await store.save();
	assert.equal(notifications, 2);

	unsubscribe();
	store.commit("space.sm", { description: "no longer listening" });
	assert.equal(notifications, 2);
});

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

test("validate reports errors for a candidate draft without writing anything", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);

	const errors = store.validate("space.sm", { value: "not-a-dimension" });

	assert.ok(errors.value);
	assert.equal(store.getError("space.sm"), undefined);
	assert.equal(store.getHasPending(), false);
});

test("reportError records a component-supplied error without staging anything", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);

	store.reportError("space.sm", { name: undefined, value: "Invalid JSON" });

	assert.equal(store.getError("space.sm")?.value, "Invalid JSON");
	assert.equal(store.getHasPending(), false);
});

test("discard drops one key's pending and error, leaving other keys untouched", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
				dimensionToken(["space", "lg"], { value: 16, unit: "px" }),
			]),
		]),
	);
	store.commit("space.sm", { value: { value: 8, unit: "px" } });
	const untouchedBefore = store.getFields("space.lg");

	store.discard("space.sm");

	assert.equal(store.getHasPending(), false);
	assert.deepEqual(store.getFields("space.sm").value, { value: 4, unit: "px" });
	assert.equal(store.getFields("space.lg"), untouchedBefore);
});

test("save() has no I/O fallback: it propagates whatever the injected save does", async () => {
	const injectedFailure = new Error("injected save failed");
	const store = new StagedEditsStore({
		initialTree: group("", []),
		referenceView: undefined,
		save: async () => {
			throw injectedFailure;
		},
	});

	await assert.rejects(store.save(), (error) => error === injectedFailure);
});

test("a failed save leaves the overlay and tree untouched and returns false", async () => {
	const store = new StagedEditsStore({
		initialTree: group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
		referenceView: undefined,
		save: async () => false,
	});
	store.commit("space.sm", { value: { value: 8, unit: "px" } });
	const treeBefore = store.getTree();

	const ok = await store.save();

	assert.equal(ok, false);
	assert.equal(store.getHasPending(), true);
	assert.equal(store.getTree(), treeBefore);
});

test("commit leaves getTree identity unchanged; only save rebuilds the tree", async () => {
	const store = new StagedEditsStore({
		initialTree: group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
		referenceView: undefined,
		save: async () => true,
	});

	const treeBefore = store.getTree();
	store.commit("space.sm", { value: { value: 8, unit: "px" } });
	assert.equal(store.getTree(), treeBefore);

	await store.save();
	assert.notEqual(store.getTree(), treeBefore);
});

test("save applies the staged edits into the base tree once, then clears the overlay", async () => {
	const saveCalls: (readonly ClientEdit[])[] = [];
	const store = new StagedEditsStore({
		initialTree: group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
		referenceView: undefined,
		save: async (edits) => {
			saveCalls.push(edits);
			return true;
		},
	});
	store.commit("space.sm", { value: { value: 8, unit: "px" } });

	const ok = await store.save();

	assert.equal(ok, true);
	assert.equal(saveCalls.length, 1);
	assert.equal(store.getHasPending(), false);
	assert.deepEqual(store.getFields("space.sm").value, { value: 8, unit: "px" });
});

test("getEdits returns a fresh array of the staged edits on each call", () => {
	const store = makeStore(
		group("", [
			group("space", [
				dimensionToken(["space", "sm"], { value: 4, unit: "px" }),
			]),
		]),
	);
	store.commit("space.sm", { value: { value: 8, unit: "px" } });

	const first = store.getEdits();
	const second = store.getEdits();

	assert.notEqual(first, second);
	assert.deepEqual(first, second);
	assert.equal(first.length, 1);
	assert.deepEqual(first[0]?.value, { value: 8, unit: "px" });
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
