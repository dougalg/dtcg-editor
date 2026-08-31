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

/** A standard DTCG type with no built-in contract and no registered editor —
 * `TreeTokenNode` renders `FallbackValueEditor` (raw-JSON text) for it. */
function fallbackToken(): TokenNode {
	return {
		kind: "token",
		name: "d",
		path: ["d"],
		value: "100ms",
		declaredType: "duration",
		effectiveType: "duration",
		inferredType: undefined,
		description: undefined,
		deprecated: undefined,
	};
}

function renderRow(node: TokenNode = smallToken()) {
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
	const reportErrorSpy = vi.fn(store.reportError);
	store.reportError = reportErrorSpy;
	render(
		<StagedEditsContext.Provider value={store}>
			<ul>
				<TreeTokenNode node={node} relativePath="a.json" />
			</ul>
		</StagedEditsContext.Provider>,
	);
	return { commitSpy, reportErrorSpy };
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

test("a keystroke in the description field updates only local draft — no store.commit until blur", () => {
	const { commitSpy } = renderRow();
	const descriptionInput = screen.getByRole("textbox", {
		name: /description/i,
	}) as HTMLTextAreaElement;

	fireEvent.change(descriptionInput, { target: { value: "a note" } });

	expect(descriptionInput.value).toBe("a note");
	expect(commitSpy).not.toHaveBeenCalled();

	fireEvent.blur(descriptionInput);
	expect(commitSpy).toHaveBeenCalledWith("small", { description: "a note" });
});

test("a keystroke in the fallback JSON editor buffers text — no store call until blur", () => {
	const { commitSpy, reportErrorSpy } = renderRow(fallbackToken());
	const jsonInput = screen.getByLabelText(
		"Value (JSON)",
	) as HTMLTextAreaElement;

	fireEvent.change(jsonInput, { target: { value: '"200ms"' } });

	expect(jsonInput.value).toBe('"200ms"');
	expect(commitSpy).not.toHaveBeenCalled();
	expect(reportErrorSpy).not.toHaveBeenCalled();

	fireEvent.blur(jsonInput);
	expect(commitSpy).toHaveBeenCalledWith("d", { value: "200ms" });
});

test("a keystroke in the typed value editor updates only local draft — no store.commit until blur", () => {
	const { commitSpy } = renderRow();
	const valueInput = screen.getByRole("spinbutton", {
		name: "Value",
	}) as HTMLInputElement;

	fireEvent.change(valueInput, { target: { value: "8" } });

	expect(valueInput.value).toBe("8");
	expect(commitSpy).not.toHaveBeenCalled();

	fireEvent.blur(valueInput);
	expect(commitSpy).toHaveBeenCalledWith("small", {
		value: { value: 8, unit: "px" },
	});
});
