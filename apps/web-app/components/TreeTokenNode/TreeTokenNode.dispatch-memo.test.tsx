import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StagedEditsContext } from "../../hooks/useStagedEdits.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { StagedEditsStore } from "../../lib/tokens/staged-edits-store.ts";

/**
 * INV-13: the `parseReference` -> contract -> editor-resolution dispatch is
 * `useMemo`'d on `shown.value` + `effectiveType` + `inferredType`. A render
 * that changes none of those (e.g. a name keystroke) must not re-run it.
 * `vi.mock` is file-scoped, so this lives in its own file.
 */
const { resolveEditorSpy } = vi.hoisted(() => ({ resolveEditorSpy: vi.fn() }));

vi.mock("../../lib/token-editors/resolve-editor.ts", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("../../lib/token-editors/resolve-editor.ts")
		>();
	return {
		...actual,
		resolveEditorForType: (extensions: unknown, type: unknown) => {
			resolveEditorSpy(type);
			return (actual.resolveEditorForType as (...args: unknown[]) => unknown)(
				extensions,
				type,
			);
		},
	};
});

const { TreeTokenNode } = await import("./TreeTokenNode.tsx");

function dimensionTree(): PlainDtcgNode {
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
				kind: "token",
				name: "small",
				path: ["small"],
				value: { value: 4, unit: "px" },
				declaredType: "dimension",
				effectiveType: "dimension",
				inferredType: undefined,
				description: undefined,
				deprecated: undefined,
			},
		],
	};
}

test("the editor-resolution dispatch is memoised — a name keystroke does not re-resolve it (U45)", () => {
	const store = new StagedEditsStore({
		initialTree: dimensionTree(),
		referenceView: undefined,
		save: async () => true,
	});
	const token = (store.getTree() as Extract<PlainDtcgNode, { kind: "group" }>)
		.children[0] as Extract<PlainDtcgNode, { kind: "token" }>;

	render(
		<StagedEditsContext.Provider value={store}>
			<ul>
				<TreeTokenNode node={token} relativePath="a.json" />
			</ul>
		</StagedEditsContext.Provider>,
	);

	const callsAfterMount = resolveEditorSpy.mock.calls.length;
	expect(callsAfterMount).toBeGreaterThan(0);

	fireEvent.change(screen.getByLabelText("small name"), {
		target: { value: "smalll" },
	});

	expect(resolveEditorSpy.mock.calls.length).toBe(callsAfterMount);
});
