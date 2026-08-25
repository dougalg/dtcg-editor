import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { ClientEdit } from "../../lib/tokens/edit-state.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TokenTree } from "../TokenTree/TokenTree.tsx";

afterEach(() => {
	document.body.innerHTML = "";
});

function twoGroupTree(): PlainDtcgNode {
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
				name: "spacing",
				path: ["spacing"],
				declaredType: undefined,
				effectiveType: undefined,
				description: undefined,
				deprecated: undefined,
				children: [
					{
						kind: "token",
						name: "small",
						path: ["spacing", "small"],
						value: { value: 4, unit: "px" },
						declaredType: "dimension",
						effectiveType: "dimension",
						inferredType: undefined,
						description: undefined,
						deprecated: undefined,
					},
				],
			},
			{
				kind: "group",
				name: "color",
				path: ["color"],
				declaredType: undefined,
				effectiveType: undefined,
				description: undefined,
				deprecated: undefined,
				children: [],
			},
		],
	};
}

function getDisclosure(): HTMLDetailsElement {
	const details = document.querySelector("details");
	if (details === null) {
		throw new Error("expected a <details> element");
	}
	return details;
}

test("renders expanded by default, with children visible", () => {
	render(<TokenTree node={twoGroupTree()} relativePath="a.json" />);
	expect(getDisclosure().open).toBe(true);
	expect(screen.getByLabelText("small name")).toBeTruthy();
});

test("clicking the disclosure control collapses the group", () => {
	render(<TokenTree node={twoGroupTree()} relativePath="a.json" />);
	const summary = document.querySelector("summary");
	if (summary === null) {
		throw new Error("expected a <summary> element");
	}
	fireEvent.click(summary);
	expect(getDisclosure().open).toBe(false);
});

test("the group name is still visible and editable while collapsed", () => {
	render(<TokenTree node={twoGroupTree()} relativePath="a.json" />);
	const summary = document.querySelector("summary");
	if (summary === null) {
		throw new Error("expected a <summary> element");
	}
	fireEvent.click(summary);
	expect(getDisclosure().open).toBe(false);

	const nameInput = screen.getByDisplayValue("spacing");
	expect(nameInput).toBeTruthy();
	fireEvent.change(nameInput, { target: { value: "gaps" } });
	expect((nameInput as HTMLInputElement).value).toBe("gaps");
});

test("rejects a rename that collides with a sibling group's name", () => {
	render(<TokenTree node={twoGroupTree()} relativePath="a.json" />);
	const nameInput = screen.getByDisplayValue("spacing");
	fireEvent.change(nameInput, { target: { value: "color" } });
	expect(screen.getByRole("alert").textContent).toMatch(/already exists/);
});

test("the disclosure control has an accessible name describing the group", () => {
	render(<TokenTree node={twoGroupTree()} relativePath="a.json" />);
	expect(screen.getByLabelText("Toggle spacing")).toBeTruthy();
	expect(screen.getByLabelText("Toggle color")).toBeTruthy();
});

test("a collapsed group stays collapsed when an unrelated edit forces a TokenTree re-render (uncontrolled-open regression)", () => {
	// The regression this guards against: if <details>'s `open` were ever
	// controlled (a changing React prop instead of the DOM's own state),
	// any re-render — even one for a totally unrelated node — would
	// re-assert the prop's value and silently re-expand this group,
	// defeating arrival (research.md §5, tasks.md T034/T037).
	render(<TokenTree node={twoGroupTree()} relativePath="a.json" />);
	const summary = document.querySelector("summary");
	if (summary === null) {
		throw new Error("expected a <summary> element");
	}
	fireEvent.click(summary);
	expect(getDisclosure().open).toBe(false);

	// Edits a sibling group's own token (color, not spacing.small), which
	// still runs through TokenTree's own onStageEdit/setState — a real
	// re-render of the whole tree, not a mock.
	const colorNameInput = screen.getByDisplayValue("color");
	fireEvent.change(colorNameInput, { target: { value: "palette" } });

	expect(getDisclosure().open).toBe(false);
});

test("staged edits are not lost when the disclosure moves between expanded and collapsed", () => {
	const pending: ClientEdit[] = [];
	// Exercises the real TokenTree state flow, not a mock, so a regression
	// in how <details> interacts with React re-renders would surface here.
	render(<TokenTree node={twoGroupTree()} relativePath="a.json" />);
	const nameInput = screen.getByDisplayValue("spacing");
	fireEvent.change(nameInput, { target: { value: "gaps" } });
	pending.push({ path: ["spacing"], name: "gaps" });

	const summary = document.querySelector("summary");
	if (summary === null) {
		throw new Error("expected a <summary> element");
	}
	fireEvent.click(summary);
	fireEvent.click(summary);

	expect(screen.getByDisplayValue("gaps")).toBeTruthy();
});
