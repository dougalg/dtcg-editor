import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { expect, test } from "vitest";
import type { PlainDtcgNode } from "../lib/tokens/plain-node.ts";
import { StagedEditsStore } from "../lib/tokens/staged-edits-store.ts";
import { StagedEditsContext } from "./useStagedEdits.ts";
import { useTokenSlice } from "./useTokenSlice.ts";

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

function makeStore(): StagedEditsStore {
	return new StagedEditsStore({
		initialTree: group("", [
			group("g", [
				dimensionToken(["g", "x"], { value: 1, unit: "px" }),
				dimensionToken(["g", "y"], { value: 2, unit: "px" }),
			]),
		]),
		referenceView: undefined,
		save: async () => true,
	});
}

function wrapperFor(store: StagedEditsStore) {
	return ({ children }: { children: ReactNode }) =>
		createElement(StagedEditsContext.Provider, { value: store }, children);
}

test("useTokenSlice returns the token's fields and error, with commit/discard bound to the key", () => {
	const store = makeStore();
	const { result } = renderHook(() => useTokenSlice("g.x"), {
		wrapper: wrapperFor(store),
	});

	expect(result.current.fields).toEqual(store.getFields("g.x"));
	expect(result.current.error).toBe(store.getError("g.x"));

	// commit takes only a draft — the hook routes it to "g.x"
	act(() => {
		result.current.commit({ value: { value: 5, unit: "px" } });
	});
	expect(store.getFields("g.x").value).toEqual({ value: 5, unit: "px" });

	// discard takes no arguments — the hook routes it to "g.x"
	act(() => {
		result.current.discard();
	});
	expect(store.getFields("g.x").value).toEqual({ value: 1, unit: "px" });
});

test("a commit to an unrelated key leaves this slice's identity intact and does not re-render the consumer", () => {
	const store = makeStore();
	let renders = 0;
	const { result } = renderHook(
		() => {
			renders++;
			return useTokenSlice("g.x");
		},
		{ wrapper: wrapperFor(store) },
	);

	const fieldsBefore = result.current.fields;
	const errorBefore = result.current.error;
	const rendersAfterMount = renders;

	act(() => {
		store.commit("g.y", { value: { value: 9, unit: "px" } });
	});

	expect(result.current.fields).toBe(fieldsBefore);
	expect(result.current.error).toBe(errorBefore);
	expect(renders).toBe(rendersAfterMount);
});

test("subscribes to the store once and never re-subscribes as the consumer re-renders", () => {
	const store = makeStore();
	let subscribeCalls = 0;
	const realSubscribe = store.subscribe;
	(store as { subscribe: typeof store.subscribe }).subscribe = (listener) => {
		subscribeCalls++;
		return realSubscribe(listener);
	};

	const { rerender } = renderHook(() => useTokenSlice("g.x"), {
		wrapper: wrapperFor(store),
	});

	// one subscription per useSyncExternalStore read (fields + error), set up once
	const afterMount = subscribeCalls;
	expect(afterMount).toBe(2);

	rerender();
	rerender();

	// a stable `subscribe` reference means the effect never tears down and re-runs
	expect(subscribeCalls).toBe(afterMount);
});
