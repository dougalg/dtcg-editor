import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Profiler } from "react";
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

test("a keystroke in the uncontrolled description textarea does no React re-render; blur commits once (U41e)", () => {
	const store = new StagedEditsStore({
		initialTree: {
			kind: "group",
			name: "",
			path: [],
			declaredType: undefined,
			effectiveType: undefined,
			description: undefined,
			deprecated: undefined,
			children: [smallToken()],
		},
		referenceView: undefined,
		save: async () => true,
	});
	const commitSpy = vi.fn(store.commit);
	store.commit = commitSpy;

	let rowRenders = 0;
	render(
		<StagedEditsContext.Provider value={store}>
			<Profiler
				id="row"
				onRender={() => {
					rowRenders += 1;
				}}
			>
				<ul>
					<TreeTokenNode node={smallToken()} relativePath="a.json" />
				</ul>
			</Profiler>
		</StagedEditsContext.Provider>,
	);

	const description = screen.getByRole("textbox", {
		name: /description/i,
	}) as HTMLTextAreaElement;
	const rendersBeforeTyping = rowRenders;

	// A burst of keystrokes: the field is uncontrolled, so the browser buffers
	// the text and React does no work per character (INV-9 intent, C-RI-2).
	for (const value of ["a", "a ", "a n", "a no", "a not", "a note"]) {
		fireEvent.change(description, { target: { value } });
	}

	expect(description.value).toBe("a note");
	expect(rowRenders).toBe(rendersBeforeTyping);
	expect(commitSpy).not.toHaveBeenCalled();

	// Blur reads the field's current DOM value and stages it exactly once.
	fireEvent.blur(description);
	expect(commitSpy).toHaveBeenCalledTimes(1);
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

test("the fallback editor calls store.reportError on a parse failure, not on a valid parse (U46)", () => {
	const { commitSpy, reportErrorSpy } = renderRow(fallbackToken());
	const jsonInput = screen.getByLabelText(
		"Value (JSON)",
	) as HTMLTextAreaElement;

	// unparseable on blur -> reportError, nothing staged
	fireEvent.change(jsonInput, { target: { value: "{ not json" } });
	fireEvent.blur(jsonInput);

	expect(reportErrorSpy).toHaveBeenCalledTimes(1);
	expect(reportErrorSpy.mock.calls[0]?.[1]?.value).toMatch(/Invalid JSON/);
	expect(commitSpy).not.toHaveBeenCalled();

	// a valid parse on blur -> commit, no further reportError
	fireEvent.change(jsonInput, { target: { value: '"300ms"' } });
	fireEvent.blur(jsonInput);

	expect(commitSpy).toHaveBeenCalledWith("d", { value: "300ms" });
	expect(reportErrorSpy).toHaveBeenCalledTimes(1);
});

test("committing an edit to a referenced token updates the referencing row's live preview (U47)", () => {
	const a = smallToken(); // "small" — {value:4,unit:"px"}
	const b: TokenNode = {
		kind: "token",
		name: "alias",
		path: ["alias"],
		value: "{small}",
		declaredType: "dimension",
		effectiveType: "dimension",
		inferredType: undefined,
		description: undefined,
		deprecated: undefined,
		references: [
			{
				reference: { targetPath: ["small"], at: [], raw: "{small}" },
				outcomes: [
					{
						mode: undefined,
						chain: {
							steps: [{ path: ["small"], file: "a.json", mode: undefined }],
							outcome: {
								kind: "resolved",
								value: { value: 4, unit: "px" },
								type: "dimension",
							},
						},
						targetFile: "a.json",
					},
				],
			},
		],
	};
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

	const bRow = screen.getByTestId("token-alias");
	expect(within(bRow).queryByText(/12/)).toBeNull();

	act(() => {
		store.commit("small", { value: { value: 12, unit: "px" } });
	});

	expect(within(bRow).getByText(/12/)).toBeTruthy();
});

test("renaming a same-file referenced token shows the referrer's preview as unresolved, not the stale value (U48)", () => {
	const a = smallToken(); // "small" — {value:4,unit:"px"}
	const b: TokenNode = {
		kind: "token",
		name: "alias",
		path: ["alias"],
		value: "{small}",
		declaredType: "dimension",
		effectiveType: "dimension",
		inferredType: undefined,
		description: undefined,
		deprecated: undefined,
		references: [
			{
				reference: { targetPath: ["small"], at: [], raw: "{small}" },
				outcomes: [
					{
						mode: undefined,
						chain: {
							steps: [{ path: ["small"], file: "a.json", mode: undefined }],
							outcome: {
								kind: "resolved",
								value: { value: 4, unit: "px" },
								type: "dimension",
							},
						},
						targetFile: "a.json",
					},
				],
			},
		],
	};
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

	const bRow = screen.getByTestId("token-alias");
	expect(within(bRow).getByText(/4px|"value":\s*4/)).toBeTruthy();

	act(() => {
		store.commit("small", { name: "renamed" });
	});

	expect(within(bRow).queryByText(/4px|"value":\s*4/)).toBeNull();
	expect(within(bRow).getByRole("alert").textContent).toMatch(/small/);
});

test("an external context re-render (theme / resolver mode) keeps the draft and focus (U49)", () => {
	const store = new StagedEditsStore({
		initialTree: {
			kind: "group",
			name: "",
			path: [],
			declaredType: undefined,
			effectiveType: undefined,
			description: undefined,
			deprecated: undefined,
			children: [smallToken()],
		},
		referenceView: undefined,
		save: async () => true,
	});
	function Harness({ node }: { node: TokenNode }) {
		return (
			<StagedEditsContext.Provider value={store}>
				<ul>
					<TreeTokenNode node={node} relativePath="a.json" />
				</ul>
			</StagedEditsContext.Provider>
		);
	}

	const { rerender } = render(<Harness node={smallToken()} />);
	const nameInput = screen.getByLabelText("small name") as HTMLInputElement;
	nameInput.focus();
	fireEvent.change(nameInput, { target: { value: "smalll" } });
	nameInput.setSelectionRange(4, 4);

	// a resolver-mode / theme re-resolve hands the row a fresh (equal) node
	rerender(<Harness node={smallToken()} />);

	const after = screen.getByLabelText("small name") as HTMLInputElement;
	expect(after).toBe(nameInput); // not remounted
	expect(after.value).toBe("smalll"); // draft preserved
	expect(document.activeElement).toBe(nameInput); // focus not lost to <body>
	expect(after.selectionStart).toBe(4);
});
