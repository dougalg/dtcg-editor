import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TokenTree } from "./TokenTree.tsx";
import type { PlainDtcgNode } from "../lib/tokens/plain-node.ts";

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
				kind: "token",
				name: "small",
				path: ["small"],
				value: { value: 4, unit: "px" },
				declaredType: "dimension",
				effectiveType: "dimension",
				description: "Small spacing",
				deprecated: undefined,
			},
			{
				kind: "token",
				name: "large",
				path: ["large"],
				value: { value: 16, unit: "px" },
				declaredType: "dimension",
				effectiveType: "dimension",
				description: undefined,
				deprecated: undefined,
			},
			{
				kind: "token",
				name: "red",
				path: ["red"],
				value: "#ff0000",
				declaredType: "color",
				effectiveType: "color",
				description: undefined,
				deprecated: undefined,
			},
		],
	};
}

function treeWithGroup(): PlainDtcgNode {
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
						description: undefined,
						deprecated: undefined,
					},
				],
			},
			{
				kind: "group",
				name: "colors",
				path: ["colors"],
				declaredType: undefined,
				effectiveType: undefined,
				description: undefined,
				deprecated: undefined,
				children: [],
			},
		],
	};
}

function stubSuccessfulFetch() {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

test("shows editable controls for a dimension token but not for other types (AC-01)", () => {
	render(<TokenTree node={tree()} relativePath="tokens.json" />);

	expect(screen.getByLabelText("small name")).toBeTruthy();
	expect(screen.getAllByLabelText("Dimension value").length).toBe(2);

	expect(screen.getByText("#ff0000")).toBeTruthy();
	expect(screen.queryByLabelText("red name")).toBeNull();
});

test("rejects a rename that collides with a sibling and does not stage it (AC-03)", () => {
	render(<TokenTree node={tree()} relativePath="tokens.json" />);

	const nameInput = screen.getByLabelText("small name");
	fireEvent.change(nameInput, { target: { value: "large" } });

	expect(screen.getByText(/already exists/)).toBeTruthy();
	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(true);
});

test("allows staging a rename into a name another pending edit just freed up", () => {
	render(<TokenTree node={tree()} relativePath="tokens.json" />);

	// Rename "large" away first, freeing up "large" for "small" to claim in the
	// same (unsaved) session — this must not be blocked by a stale check that
	// only looks at the last-saved tree.
	fireEvent.change(screen.getByLabelText("large name"), {
		target: { value: "big" },
	});
	fireEvent.change(screen.getByLabelText("small name"), {
		target: { value: "large" },
	});

	expect(screen.queryByText(/already exists/)).toBeNull();
	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(false);
});

test("keeps a pending edit visible and editable after a failed save (AC-06)", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					error: "disk full",
					kind: "unknown",
					message: "disk full",
				}),
				{ status: 500 },
			),
		),
	);

	render(<TokenTree node={tree()} relativePath="tokens.json" />);

	const nameInput = screen.getByLabelText("small name");
	fireEvent.change(nameInput, { target: { value: "tiny" } });

	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(false);
	fireEvent.click(saveButton);

	await vi.waitFor(() => {
		expect(screen.getByText("disk full")).toBeTruthy();
	});

	expect(screen.getByLabelText("small name")).toHaveProperty("value", "tiny");
	expect(saveButton.disabled).toBe(false);
});

test("a non-root group's name is an editable input; the root group's is not (AC-01, AC-09)", () => {
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	const groupNameInput = screen.getByLabelText(
		"spacing name",
	) as HTMLInputElement;
	expect(groupNameInput.tagName).toBe("INPUT");
	expect(groupNameInput.value).toBe("spacing");

	// The root group (empty name, rendered as "/") has no editable input at
	// all — only "spacing", "colors" (group names) and "small" (token
	// name/description) contribute the tree's 4 text inputs.
	expect(screen.getAllByRole("textbox").length).toBe(4);
	expect(screen.getByText("/")).toBeTruthy();
});

test("rejects a group rename that collides with a sibling group and does not stage it (AC-04)", () => {
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	fireEvent.change(screen.getByLabelText("spacing name"), {
		target: { value: "colors" },
	});

	expect(screen.getByText(/already exists/)).toBeTruthy();
	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(true);
});

test("rejects a group rename to an empty/whitespace-only name and does not stage it (AC-03)", () => {
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	fireEvent.change(screen.getByLabelText("spacing name"), {
		target: { value: "   " },
	});

	expect(screen.getByText(/cannot be empty/)).toBeTruthy();
	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(true);
});

test("accepts a group rename to its own current name as a no-op (AC-06)", () => {
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	fireEvent.change(screen.getByLabelText("spacing name"), {
		target: { value: "spacing" },
	});

	expect(screen.queryByText(/already exists/)).toBeNull();
	expect(screen.queryByText(/cannot be empty/)).toBeNull();
});

test("saves a staged group rename and updates the tree, including descendant paths (AC-02, AC-07)", async () => {
	stubSuccessfulFetch();
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	fireEvent.change(screen.getByLabelText("spacing name"), {
		target: { value: "gaps" },
	});
	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(false);
	fireEvent.click(saveButton);

	await vi.waitFor(() => {
		expect(screen.getByLabelText("gaps name")).toBeTruthy();
	});
	expect(screen.getByLabelText("small name")).toBeTruthy();
	expect(saveButton.disabled).toBe(true);
});

test("saves a group rename together with a staged edit on one of its descendant tokens (AC-08)", async () => {
	stubSuccessfulFetch();
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	fireEvent.change(screen.getByLabelText("spacing name"), {
		target: { value: "gaps" },
	});
	fireEvent.change(screen.getByLabelText("small name"), {
		target: { value: "tiny" },
	});

	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	fireEvent.click(saveButton);

	await vi.waitFor(() => {
		expect(screen.getByLabelText("gaps name")).toBeTruthy();
	});
	expect(screen.getByLabelText("tiny name")).toBeTruthy();
});

test("every field has visible label text, not just an accessible name (AC-10, AC-11, AC-12)", () => {
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	expect(screen.getByText("spacing name")).toBeTruthy();
	expect(screen.getByText("small name")).toBeTruthy();
	expect(screen.getByText("small description")).toBeTruthy();
	expect(screen.getAllByText("Dimension value").length).toBeGreaterThan(0);
	expect(screen.getAllByText("Dimension unit").length).toBeGreaterThan(0);
});
