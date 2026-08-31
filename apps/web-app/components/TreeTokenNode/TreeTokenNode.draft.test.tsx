import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

function renderRow(node: TokenNode = smallToken(), siblings: TokenNode[] = []) {
	const store = new StagedEditsStore({
		initialTree: {
			kind: "group",
			name: "",
			path: [],
			declaredType: undefined,
			effectiveType: undefined,
			description: undefined,
			deprecated: undefined,
			children: [node, ...siblings],
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

test("a rejected commit keeps the draft on screen and surfaces the error (U42)", () => {
	const large: TokenNode = { ...smallToken(), name: "large", path: ["large"] };
	const { commitSpy } = renderRow(smallToken(), [large]);
	const nameInput = screen.getByLabelText("small name") as HTMLInputElement;

	// rename "small" onto its sibling "large" — the store rejects it
	fireEvent.change(nameInput, { target: { value: "large" } });
	fireEvent.blur(nameInput);

	expect(commitSpy).toHaveBeenCalledTimes(1);
	expect(commitSpy).toHaveBeenCalledWith("small", { name: "large" });
	// draft retained — the field still shows the rejected value to fix
	expect(nameInput.value).toBe("large");
	expect(screen.getByRole("alert").textContent).toMatch(
		/already used by a sibling/,
	);
});

test("editing another row does not move the caret in the focused field (U43)", () => {
	const a = smallToken();
	const b: TokenNode = { ...smallToken(), name: "big", path: ["big"] };
	const store = new StagedEditsStore({
		initialTree: {
			kind: "group",
			name: "",
			path: [],
			declaredType: undefined,
			effectiveType: undefined,
			description: undefined,
			deprecated: undefined,
			children: [a, b],
		},
		referenceView: undefined,
		save: async () => true,
	});
	render(
		<StagedEditsContext.Provider value={store}>
			<ul>
				<TreeTokenNode node={a} relativePath="a.json" />
				<TreeTokenNode node={b} relativePath="a.json" />
			</ul>
		</StagedEditsContext.Provider>,
	);

	const aName = screen.getByLabelText("small name") as HTMLInputElement;
	aName.focus();
	fireEvent.change(aName, { target: { value: "smalll" } });
	aName.setSelectionRange(3, 3);

	act(() => {
		store.commit("big", { name: "bigger" });
	});

	expect(document.activeElement).toBe(aName);
	expect(aName.value).toBe("smalll");
	expect(aName.selectionStart).toBe(3);
});

test("committing an edit shows no spinner / skeleton / disabled state in the row (U44)", () => {
	const { commitSpy } = renderRow();
	const row = screen.getByTestId("token-small");
	const valueInput = screen.getByRole("spinbutton", {
		name: "Value",
	}) as HTMLInputElement;

	fireEvent.change(valueInput, { target: { value: "9" } });
	fireEvent.blur(valueInput);

	expect(commitSpy).toHaveBeenCalledTimes(1);
	// nothing in the row goes busy / disabled for the edit (the Save button
	// enabling — outside the row — does not count).
	expect(within(row).queryByRole("progressbar")).toBeNull();
	const rowAndDescendants = [row, ...row.querySelectorAll("*")];
	expect(
		rowAndDescendants.some((el) => el.getAttribute("aria-busy") === "true"),
	).toBe(false);
	expect(row.querySelector(":disabled")).toBeNull();
	expect(row.matches(":disabled")).toBe(false);
	expect(valueInput.disabled).toBe(false);
});
