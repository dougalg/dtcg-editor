import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { expect, test } from "vitest";
import type { PlainDtcgNode } from "../lib/tokens/plain-node.ts";
import { StagedEditsStore } from "../lib/tokens/staged-edits-store.ts";
import { useResolvedPreview } from "./useResolvedPreview.ts";
import { StagedEditsContext } from "./useStagedEdits.ts";

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
				dimensionToken(["g", "a"], { value: 4, unit: "px" }),
				dimensionToken(["g", "b"], "{g.a}"),
				dimensionToken(["g", "c"], { value: 9, unit: "px" }),
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

test("useResolvedPreview mirrors the store's preview for the key, and follows a dependency edit", () => {
	const store = makeStore();
	let renders = 0;
	const { result } = renderHook(
		() => {
			renders++;
			return useResolvedPreview("g.b");
		},
		{ wrapper: wrapperFor(store) },
	);

	expect(result.current).toEqual(store.getResolvedPreview("g.b"));
	expect(result.current).toMatchObject({
		kind: "value",
		value: { value: 4, unit: "px" },
	});

	// committing the referenced token updates g.b's preview
	act(() => {
		store.commit("g.a", { value: { value: 7, unit: "px" } });
	});
	expect(result.current).toMatchObject({
		kind: "value",
		value: { value: 7, unit: "px" },
	});

	// committing an unrelated token does not disturb g.b's preview or re-render
	const stable = result.current;
	const rendersBefore = renders;
	act(() => {
		store.commit("g.c", { value: { value: 1, unit: "px" } });
	});
	expect(result.current).toBe(stable);
	expect(renders).toBe(rendersBefore);
});
