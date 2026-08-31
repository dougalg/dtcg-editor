import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StagedEditsContext } from "../../hooks/useStagedEdits.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { StagedEditsStore } from "../../lib/tokens/staged-edits-store.ts";
import { TreeGroupNode } from "./TreeGroupNode.tsx";

type GroupNode = Extract<PlainDtcgNode, { kind: "group" }>;

function tree(): PlainDtcgNode {
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
				kind: "group",
				name: "g",
				path: ["g"],
				declaredType: undefined,
				effectiveType: undefined,
				description: undefined,
				deprecated: undefined,
				children: [
					{
						kind: "group",
						name: "colour",
						path: ["colour"],
						declaredType: undefined,
						effectiveType: undefined,
						description: undefined,
						deprecated: undefined,
						children: [],
					},
				],
			},
		],
	};
}

function renderGroup() {
	const store = new StagedEditsStore({
		initialTree: tree(),
		referenceView: undefined,
		save: async () => true,
	});
	const commitSpy = vi.fn(store.commit);
	store.commit = commitSpy;
	const reportErrorSpy = vi.fn(store.reportError);
	store.reportError = reportErrorSpy;
	const gNode = (store.getTree() as GroupNode).children[0] as GroupNode;
	render(
		<StagedEditsContext.Provider value={store}>
			<ul>
				<TreeGroupNode node={gNode} relativePath="a.json" />
			</ul>
		</StagedEditsContext.Provider>,
	);
	return { commitSpy, reportErrorSpy };
}

test("a keystroke in the group-name field updates only local draft — no store.commit until blur (U51)", () => {
	const { commitSpy } = renderGroup();
	const nameInput = screen.getByDisplayValue("g") as HTMLInputElement;

	fireEvent.change(nameInput, { target: { value: "grid" } });

	expect(nameInput.value).toBe("grid");
	expect(commitSpy).not.toHaveBeenCalled();

	fireEvent.blur(nameInput);
	expect(commitSpy).toHaveBeenCalledWith("g", { name: "grid" });
});
