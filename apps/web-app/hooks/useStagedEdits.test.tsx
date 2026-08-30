import { renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import type { PlainDtcgNode } from "../lib/tokens/plain-node.ts";
import { useStagedEdits } from "./useStagedEdits.ts";

const EMPTY_TREE: PlainDtcgNode = {
	kind: "group",
	name: "",
	path: [],
	declaredType: undefined,
	effectiveType: undefined,
	description: undefined,
	deprecated: undefined,
	children: [],
};

function options() {
	return {
		initialTree: EMPTY_TREE,
		referenceView: undefined,
		save: async () => true,
	};
}

test("useStagedEdits threads the injected save through to the store", async () => {
	let savedWith: unknown;
	const { result } = renderHook(() =>
		useStagedEdits({
			initialTree: EMPTY_TREE,
			referenceView: undefined,
			save: async (edits) => {
				savedWith = edits;
				return true;
			},
		}),
	);

	await result.current.save();

	expect(savedWith).toEqual([]);
});

test("useStagedEdits makes one store per mount and keeps it across re-renders", () => {
	const first = renderHook(() => useStagedEdits(options()));
	const storeOnMount = first.result.current;

	first.rerender();
	expect(first.result.current).toBe(storeOnMount);

	const second = renderHook(() => useStagedEdits(options()));
	expect(second.result.current).not.toBe(storeOnMount);
});
