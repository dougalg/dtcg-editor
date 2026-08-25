import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { TokenTree } from "../TokenTree/TokenTree.tsx";

function inferredTypeTree(
	inferredType: string | undefined,
	value: unknown,
): PlainDtcgNode {
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
				declaredType: undefined,
				effectiveType: inferredType,
				inferredType,
				description: undefined,
				deprecated: undefined,
			},
		],
	};
}

afterEach(() => {
	document.body.innerHTML = "";
});

function referenceTree(
	declaredType: string,
	raw: string,
	resolved: ResolvedReference | undefined,
): PlainDtcgNode {
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
				name: "text",
				path: ["text"],
				value: raw,
				declaredType,
				effectiveType: declaredType,
				inferredType: undefined,
				description: undefined,
				deprecated: undefined,
				...(resolved !== undefined ? { references: [resolved] } : {}),
			},
		],
	};
}

function resolvedColor(): ResolvedReference {
	return {
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
	};
}

function resolvedDimension(): ResolvedReference {
	return {
		reference: { targetPath: ["space", "4"], at: [], raw: "{space.4}" },
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [{ path: ["space", "4"], file: "base.json", mode: undefined }],
					outcome: {
						kind: "resolved",
						value: { value: 1, unit: "rem" },
						type: "dimension",
					},
				},
				targetFile: "base.json",
			},
		],
	};
}

test("a color token holding a reference renders no validation error (FR-009 regression)", () => {
	render(
		<TokenTree
			node={referenceTree("color", "{color.brand.blue}", resolvedColor())}
			relativePath="a.json"
		/>,
	);
	expect(screen.queryByRole("alert")).toBeNull();
	expect(screen.queryByText(/6-digit hex/)).toBeNull();
});

test("a color token holding a reference shows its resolved value", () => {
	render(
		<TokenTree
			node={referenceTree("color", "{color.brand.blue}", resolvedColor())}
			relativePath="a.json"
		/>,
	);
	expect(screen.getByText("{color.brand.blue}")).toBeTruthy();
	expect(screen.getByText(/srgb/)).toBeTruthy();
});

test("a dimension token holding a reference renders no validation error", () => {
	render(
		<TokenTree
			node={referenceTree("dimension", "{space.4}", resolvedDimension())}
			relativePath="a.json"
		/>,
	);
	expect(screen.queryByRole("alert")).toBeNull();
});

test("a dimension token holding a reference shows its resolved value", () => {
	render(
		<TokenTree
			node={referenceTree("dimension", "{space.4}", resolvedDimension())}
			relativePath="a.json"
		/>,
	);
	expect(screen.getByText("{space.4}")).toBeTruthy();
	expect(screen.getByText(/rem/)).toBeTruthy();
});

test("a token that both holds a reference and is itself referenced shows both indicators", () => {
	const tree: PlainDtcgNode = {
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
				name: "text",
				path: ["text"],
				value: "{color.brand.blue}",
				declaredType: "color",
				effectiveType: "color",
				inferredType: undefined,
				description: undefined,
				deprecated: undefined,
				references: [resolvedColor()],
				referencedBy: [{ path: ["action", "default"], file: "a.json" }],
			},
		],
	};
	render(<TokenTree node={tree} relativePath="a.json" />);

	// Holds a reference (a navigable link to its own target)...
	expect(screen.getByText("{color.brand.blue}")).toBeTruthy();
	// ...and is itself referenced (the reverse-index badge).
	expect(screen.getByText("referenced once")).toBeTruthy();
});

test("a non-reference invalid color value is still reported as invalid (no regression on the non-reference path)", () => {
	render(
		<TokenTree
			node={referenceTree("color", "not-a-color", undefined)}
			relativePath="a.json"
		/>,
	);
	expect(screen.getByRole("alert")).toBeTruthy();
});

test("an inferred-but-undeclared-type token renders editable with the suggested type visible (FR-003b)", () => {
	render(
		<TokenTree
			node={inferredTypeTree("color", {
				colorSpace: "srgb",
				components: [0, 0, 0],
			})}
			relativePath="a.json"
		/>,
	);
	expect(screen.getByText(/Suggested type: color/)).toBeTruthy();
	expect(screen.getByRole("button", { name: "Use this type" })).toBeTruthy();
	// No read-only "unsupported" state — the token is on the normal editable path.
	expect(screen.queryByText(/Only standard DTCG token types/)).toBeNull();
});

test("accepting the suggestion stages a type edit and hides the suggestion", () => {
	render(
		<TokenTree
			node={inferredTypeTree("color", {
				colorSpace: "srgb",
				components: [0, 0, 0],
			})}
			relativePath="a.json"
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Use this type" }));
	expect(screen.queryByText(/Suggested type: color/)).toBeNull();
});

test("a token with no inference available still renders the existing read-only untyped path unchanged", () => {
	render(
		<TokenTree
			node={inferredTypeTree(undefined, { nonsense: true })}
			relativePath="a.json"
		/>,
	);
	expect(screen.queryByText(/Suggested type/)).toBeNull();
	expect(screen.queryByRole("button", { name: "Use this type" })).toBeNull();
});
