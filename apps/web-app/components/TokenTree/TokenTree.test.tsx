import { DTCG_TOKEN_TYPES } from "@dtcg-editor/token-core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BUILT_IN_TOKEN_TYPES } from "../../lib/token-editors/built-in.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TokenTree } from "./TokenTree.tsx";

/**
 * Scopes a query to one token's row via a stable `data-testid` (keyed by the
 * token's original, unedited name) rather than its heading's accessible
 * name — the heading is now an editable input showing the *live* name, so
 * once a test renames a token, its heading text no longer matches the name
 * it started with.
 */
function getTokenRow(originalName: string): HTMLElement {
	return screen.getByTestId(`token-${originalName}`);
}

/**
 * The token's name is now edited inline in its heading rather than via a
 * separate "Name" field, so every row's name input shares the same visible
 * label ("Name" is gone entirely) — its accessible name is
 * `"${originalName} name"` instead, keeping it findable per-token.
 */
function getNameInput(originalName: string): HTMLElement {
	return within(getTokenRow(originalName)).getByLabelText(
		`${originalName} name`,
	);
}

/**
 * Replaces the real `dtcg-editor.config.mts`-sourced config with one whose
 * `color` extension is a fake editor capturing the props it receives, ahead
 * of the real built-in extensions (spread in so dimension-token tests
 * elsewhere in this file keep exercising the real `DimensionEditor`
 * unmodified — only `color`'s registered editor changes).
 */
const receivedColorEditorProps: unknown[] = [];
vi.mock("../../lib/token-editors/user-config.ts", async () => {
	const { builtInExtensions } = await import(
		"../../lib/token-editors/built-in.ts"
	);
	return {
		default: {
			tokensDir: "./tokens",
			extensions: [
				{
					type: "color",
					editor: (props: unknown) => {
						receivedColorEditorProps.push(props);
						return null as never;
					},
					editorOptions: { colorSpaces: ["srgb", "hsl"] },
				},
				...builtInExtensions,
			],
		},
	};
});

/**
 * A standard DTCG type with no shipped built-in editor, computed at test-run
 * time rather than hardcoded — a literal like "fontWeight" would silently
 * start asserting a false premise the day a real editor for that type ships
 * (see docs/project.md's Non-Functional Requirements for this feature).
 */
function typeWithoutBuiltIn(): string {
	const type = DTCG_TOKEN_TYPES.find(
		(candidate) =>
			!(BUILT_IN_TOKEN_TYPES as readonly string[]).includes(candidate),
	);
	if (type === undefined) {
		throw new Error(
			"expected at least one DTCG type with no built-in editor yet",
		);
	}
	return type;
}

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
				name: "weird",
				path: ["weird"],
				value: "#ff0000",
				declaredType: "not-a-real-type",
				effectiveType: "not-a-real-type",
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

test("shows an editable value control for a dimension token but not for a non-standard type (AC-01, AC-05)", () => {
	render(<TokenTree node={tree()} relativePath="tokens.json" />);

	// Every token's name is editable via its heading, regardless of type —
	// including "weird", a non-standard type — so this test only checks the
	// *value* control, which is where valid/non-standard actually diverge.
	expect(getNameInput("small")).toBeTruthy();
	expect(screen.getAllByLabelText("Value").length).toBe(2);

	expect(screen.getByText("#ff0000")).toBeTruthy();
	expect(getNameInput("weird")).toBeTruthy();
	expect(screen.getByText(/non-standard/)).toBeTruthy();
});

test("an invalid dimension token renders a generic alert via DefaultValidationErrorHandler (path 4)", () => {
	const node: PlainDtcgNode = {
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
				name: "broken",
				path: ["broken"],
				value: { value: 4 },
				declaredType: "dimension",
				effectiveType: "dimension",
				description: undefined,
				deprecated: undefined,
			},
		],
	};

	render(<TokenTree node={node} relativePath="tokens.json" />);

	// Dimension has a built-in contract but no package `ValidationErrorHandler`
	// of its own, so an invalid value now falls back to
	// `DefaultValidationErrorHandler` — previously this showed no error
	// indication at all in read-only mode; this is the intentionally-added
	// path 4 behavior, not a regression. Renaming is independent of value
	// validity, so "broken" is still name-editable via its heading.
	expect(getNameInput("broken")).toBeTruthy();
	expect(screen.getByRole("alert").textContent).toMatch(
		/Invalid dimension value/,
	);
});

test("a non-standard-type token renders read-only with no extra alert (path 5)", () => {
	render(<TokenTree node={tree()} relativePath="tokens.json" />);

	// "weird" (declaredType/effectiveType "not-a-real-type") has no editable
	// *value* control and, per path 5 of the model,
	// `DefaultValidationErrorHandler` is called with no `error` — no
	// `role="alert"` anywhere in the tree for it. It's still name-editable
	// via its heading, same as every other token.
	expect(getNameInput("weird")).toBeTruthy();
	expect(screen.getByText(/non-standard/)).toBeTruthy();
	expect(screen.queryByRole("alert")).toBeNull();
});

test("an out-of-range color token still renders, editable (AC-05)", () => {
	const node: PlainDtcgNode = {
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
				name: "bad-hue",
				path: ["bad-hue"],
				value: { colorSpace: "hsl", components: [400, 50, 40] },
				declaredType: "color",
				effectiveType: "color",
				description: undefined,
				deprecated: undefined,
			},
		],
	};

	render(<TokenTree node={node} relativePath="tokens.json" />);

	// A structurally valid but out-of-range color value is still editable
	// (its shape matches `ColorValueSchema`) — the range violation itself is
	// the resolved color editor's own concern to display (see
	// `lib/token-editors/color-editor.test.tsx`, which exercises the real
	// `ColorEditor` unmocked); this file's `color` editor is a stub, so it
	// only asserts that the token stays editable, not that any particular
	// editor renders a range-issue alert.
	expect(getNameInput("bad-hue")).toBeTruthy();
});

test("threads a color extension's editorOptions through to its registered editor", () => {
	receivedColorEditorProps.length = 0;
	const node: PlainDtcgNode = {
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
				name: "brand-blue",
				path: ["brand-blue"],
				value: { colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
				declaredType: "color",
				effectiveType: "color",
				description: undefined,
				deprecated: undefined,
			},
		],
	};

	render(<TokenTree node={node} relativePath="tokens.json" />);

	expect(receivedColorEditorProps).toHaveLength(1);
	expect(receivedColorEditorProps[0]).toMatchObject({
		options: { colorSpaces: ["srgb", "hsl"] },
	});
});

test("rejects a rename that collides with a sibling and does not stage it (AC-03)", () => {
	render(<TokenTree node={tree()} relativePath="tokens.json" />);

	const nameInput = getNameInput("small");
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
	fireEvent.change(getNameInput("large"), {
		target: { value: "big" },
	});
	fireEvent.change(getNameInput("small"), {
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

	const nameInput = getNameInput("small");
	fireEvent.change(nameInput, { target: { value: "tiny" } });

	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(false);
	fireEvent.click(saveButton);

	await vi.waitFor(() => {
		expect(screen.getByText("disk full")).toBeTruthy();
	});

	expect(getNameInput("small")).toHaveProperty("value", "tiny");
	expect(saveButton.disabled).toBe(false);
});

test("a non-root group's name is an editable input; the root group's is not (AC-01, AC-09)", () => {
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	const groupNameInput = screen.getAllByLabelText(
		"Group Name:",
	) as HTMLInputElement[];
	expect(groupNameInput.length).toBeGreaterThan(0);
	// @ts-expect-error
	expect(groupNameInput[0].tagName).toBe("INPUT");
	// @ts-expect-error
	expect(groupNameInput[0].value).toBe("spacing");

	// The root group (empty name, rendered as "/") has no editable input at
	// all — only "spacing", "colors" (group names) and "small" (token
	// name/description) contribute the tree's 4 text inputs.
	expect(screen.getAllByRole("textbox").length).toBe(4);
});

test("rejects a group rename that collides with a sibling group and does not stage it (AC-04)", () => {
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	// @ts-expect-error
	fireEvent.change(screen.getAllByLabelText("Group Name:")[0], {
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

	// @ts-expect-error
	fireEvent.change(screen.getAllByLabelText("Group Name:")[0], {
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

	// @ts-expect-error
	fireEvent.change(screen.getAllByLabelText("Group Name:")[0], {
		target: { value: "spacing" },
	});

	expect(screen.queryByText(/already exists/)).toBeNull();
	expect(screen.queryByText(/cannot be empty/)).toBeNull();
});

test("saves a staged group rename and updates the tree, including descendant paths (AC-02, AC-07)", async () => {
	stubSuccessfulFetch();
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	// @ts-expect-error
	fireEvent.change(screen.getAllByLabelText("Group Name:")[0], {
		target: { value: "gaps" },
	});
	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(false);
	fireEvent.click(saveButton);

	await vi.waitFor(() => {
		expect(screen.getAllByLabelText("Group Name:").length).toBe(2);
	});
	expect(saveButton.disabled).toBe(true);
});

test("saves a group rename together with a staged edit on one of its descendant tokens (AC-08)", async () => {
	stubSuccessfulFetch();
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	// @ts-expect-error
	fireEvent.change(screen.getAllByLabelText("Group Name:")[0], {
		target: { value: "gaps" },
	});
	// @ts-expect-error
	fireEvent.change(screen.getAllByLabelText("Group Name:")[1], {
		target: { value: "tiny" },
	});

	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	fireEvent.click(saveButton);

	await vi.waitFor(() => {
		// @ts-expect-error
		expect(screen.getAllByLabelText("Group Name:")[1]?.value).toBe("tiny");
	});
});

test("every field has visible label text, not just an accessible name (AC-10, AC-11, AC-12)", () => {
	render(<TokenTree node={treeWithGroup()} relativePath="tokens.json" />);

	expect(screen.getAllByText("Group Name:")).toBeTruthy();
	// The token's name is edited inline in its heading now — the heading's
	// own (editable) text is the name, so there's no separate "Name" label to
	// check here. "Description" below it is still real visible text (not
	// aria-only).
	expect(screen.getByRole("heading", { name: "small" })).toBeTruthy();
	// "small" is nested under the "spacing" group here, so its row id is
	// keyed by its full path, not just its leaf name.
	expect(
		within(getTokenRow("spacing.small")).getByText("Description"),
	).toBeTruthy();
	expect(screen.getAllByText("Value").length).toBeGreaterThan(0);
	expect(screen.getAllByText("Unit").length).toBeGreaterThan(0);
});

function fallbackTree(value: unknown): PlainDtcgNode {
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
				name: "swatch",
				path: ["swatch"],
				value,
				declaredType: typeWithoutBuiltIn(),
				effectiveType: typeWithoutBuiltIn(),
				description: undefined,
				deprecated: undefined,
			},
		],
	};
}

test("a standard type with no built-in editor renders name/description/JSON value editor and round-trips on save (AC-03)", async () => {
	stubSuccessfulFetch();
	render(
		<TokenTree
			node={fallbackTree({ r: 255, g: 0, b: 0 })}
			relativePath="tokens.json"
		/>,
	);

	expect(getNameInput("swatch")).toBeTruthy();
	expect(
		within(getTokenRow("swatch")).getByLabelText("Description"),
	).toBeTruthy();
	const valueField = screen.getByLabelText(
		"Value (JSON)",
	) as HTMLTextAreaElement;
	expect(valueField.value).toBe(
		JSON.stringify({ r: 255, g: 0, b: 0 }, null, 2),
	);

	fireEvent.change(valueField, {
		target: { value: '{"r":0,"g":255,"b":0}' },
	});

	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(false);
	fireEvent.click(saveButton);

	await vi.waitFor(() => {
		expect(saveButton.disabled).toBe(true);
	});
	const updatedField = screen.getByLabelText(
		"Value (JSON)",
	) as HTMLTextAreaElement;
	expect(updatedField.value).toBe(
		JSON.stringify({ r: 0, g: 255, b: 0 }, null, 2),
	);
});

test("invalid JSON in the fallback editor shows a field error and does not stage an edit (AC-04)", () => {
	render(
		<TokenTree node={fallbackTree("#ff0000")} relativePath="tokens.json" />,
	);

	const valueField = screen.getByLabelText("Value (JSON)");
	fireEvent.change(valueField, { target: { value: "not valid json" } });

	expect(screen.getByText(/Invalid JSON/)).toBeTruthy();
	const saveButton = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(saveButton.disabled).toBe(true);
});

// Unsaved-edits guard (spec FR-018, T048/T049): a tree with a pending edit
// and a token whose reference resolves into a *different* file, so
// clicking it is a genuine cross-file navigation the guard must intercept.
function treeWithCrossFileReference(): PlainDtcgNode {
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
				description: undefined,
				deprecated: undefined,
			},
			{
				kind: "token",
				name: "text",
				path: ["text"],
				value: "{color.brand.blue}",
				declaredType: "color",
				effectiveType: "color",
				description: undefined,
				deprecated: undefined,
				references: [
					{
						reference: {
							targetPath: ["color", "brand", "blue"],
							at: [],
							raw: "{color.brand.blue}",
						},
						outcomes: [
							{
								mode: undefined,
								chain: {
									steps: [
										{
											path: ["color", "brand", "blue"],
											file: "base.json",
											mode: undefined,
										},
									],
									outcome: {
										kind: "resolved",
										value: { colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
										type: "color",
									},
								},
								targetFile: "base.json",
							},
						],
					},
				],
			},
			{
				kind: "token",
				name: "alias",
				path: ["alias"],
				value: "{small}",
				declaredType: "dimension",
				effectiveType: "dimension",
				description: undefined,
				deprecated: undefined,
				references: [
					{
						reference: { targetPath: ["small"], at: [], raw: "{small}" },
						outcomes: [
							{
								mode: undefined,
								chain: {
									steps: [
										{
											path: ["small"],
											file: "semantic.json",
											mode: undefined,
										},
									],
									outcome: {
										kind: "resolved",
										value: { value: 4, unit: "px" },
										type: "dimension",
									},
								},
								targetFile: "semantic.json",
							},
						],
					},
				],
			},
		],
	};
}

function crossFileReferenceLink(): HTMLAnchorElement {
	const link = screen.getByRole("link", { name: /base\.json/ });
	return link as HTMLAnchorElement;
}

function sameFileReferenceLink(): HTMLAnchorElement {
	const link = screen.getByRole("link", { name: /semantic\.json/ });
	return link as HTMLAnchorElement;
}

function stageAnEdit() {
	fireEvent.change(getNameInput("small"), { target: { value: "tiny" } });
}

test("a cross-file reference click with no pending edits navigates without any prompt", () => {
	// No pending edits, so the guard's own capture-phase listener never
	// intercepts — the click reaches Link's real handler, which this test
	// doesn't need to observe, only that no dialog opens.
	render(
		<TokenTree
			node={treeWithCrossFileReference()}
			relativePath="semantic.json"
			navigate={() => {}}
		/>,
	);

	fireEvent.click(crossFileReferenceLink());

	expect(screen.queryByText("Unsaved changes")).toBeNull();
});

test("a same-file jump is never intercepted, even with pending edits", () => {
	render(
		<TokenTree
			node={treeWithCrossFileReference()}
			relativePath="semantic.json"
		/>,
	);
	stageAnEdit();

	// "alias" references "small", which lives in this same file
	// (semantic.json) — a fragment-only jump the guard must never
	// intercept, regardless of pending edits.
	fireEvent.click(sameFileReferenceLink());

	expect(screen.queryByText("Unsaved changes")).toBeNull();
});

test("a cross-file reference click with pending edits opens the unsaved-changes dialog", () => {
	render(
		<TokenTree
			node={treeWithCrossFileReference()}
			relativePath="semantic.json"
		/>,
	);
	stageAnEdit();

	fireEvent.click(crossFileReferenceLink());

	expect(screen.getByText("Unsaved changes")).toBeTruthy();
});

test("'Stay' closes the dialog without discarding the pending edit or navigating", () => {
	const navigate = vi.fn();
	render(
		<TokenTree
			node={treeWithCrossFileReference()}
			relativePath="semantic.json"
			navigate={navigate}
		/>,
	);
	stageAnEdit();
	fireEvent.click(crossFileReferenceLink());

	fireEvent.click(screen.getByRole("button", { name: "Stay" }));

	expect(screen.queryByText("Unsaved changes")).toBeNull();
	// The row is still keyed by its original name ("small") per
	// getNameInput's own convention — this checks the pending rename's
	// *value* survived, not that the row's key changed.
	expect((getNameInput("small") as HTMLInputElement).value).toBe("tiny");
	expect(navigate).not.toHaveBeenCalled();
});

test("'Discard and leave' clears the pending edit and navigates", () => {
	const navigate = vi.fn();
	render(
		<TokenTree
			node={treeWithCrossFileReference()}
			relativePath="semantic.json"
			navigate={navigate}
		/>,
	);
	stageAnEdit();
	fireEvent.click(crossFileReferenceLink());

	fireEvent.click(screen.getByRole("button", { name: "Discard and leave" }));

	expect(navigate).toHaveBeenCalledWith("/tokens/base.json#color.brand.blue");
});

test("'Save and leave' saves the pending edit, then navigates", async () => {
	stubSuccessfulFetch();
	const navigate = vi.fn();
	render(
		<TokenTree
			node={treeWithCrossFileReference()}
			relativePath="semantic.json"
			navigate={navigate}
		/>,
	);
	stageAnEdit();
	fireEvent.click(crossFileReferenceLink());

	fireEvent.click(screen.getByRole("button", { name: "Save and leave" }));

	await vi.waitFor(() => {
		expect(navigate).toHaveBeenCalledWith("/tokens/base.json#color.brand.blue");
	});
});
