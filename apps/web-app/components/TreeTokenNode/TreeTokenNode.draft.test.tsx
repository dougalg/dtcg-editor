import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StagedEditsContext } from "../../hooks/useStagedEdits.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { StagedEditsStore } from "../../lib/tokens/staged-edits-store.ts";
import { TreeTokenNode } from "./TreeTokenNode.tsx";

type TokenNode = Extract<PlainDtcgNode, { kind: "token" }>;

function smallToken(): TokenNode {
	return {
		kind: "token",
		name: "small",
		path: ["small"],
		value: { value: 4, unit: "px" },
		declaredType: "dimension",
		effectiveType: "dimension",
		inferredType: undefined,
		description: undefined,
		deprecated: undefined,
	};
}

function renderRow() {
	const node = smallToken();
	const store = new StagedEditsStore({
		initialTree: {
			kind: "group",
			name: "",
			path: [],
			declaredType: undefined,
			effectiveType: undefined,
			description: undefined,
			deprecated: undefined,
			children: [node],
		},
		referenceView: undefined,
		save: async () => true,
	});
	const commitSpy = vi.fn(store.commit);
	store.commit = commitSpy;
	render(
		<StagedEditsContext.Provider value={store}>
			<ul>
				<TreeTokenNode node={node} relativePath="a.json" />
			</ul>
		</StagedEditsContext.Provider>,
	);
	return { commitSpy };
}

test("a keystroke in the name field updates only local draft — no store.commit until blur", () => {
	const { commitSpy } = renderRow();
	const nameInput = screen.getByLabelText("small name") as HTMLInputElement;

	fireEvent.change(nameInput, { target: { value: "tiny" } });

	// the drafted value is shown...
	expect(nameInput.value).toBe("tiny");
	// ...but nothing is staged yet
	expect(commitSpy).not.toHaveBeenCalled();

	fireEvent.blur(nameInput);
	expect(commitSpy).toHaveBeenCalledWith("small", { name: "tiny" });
});
