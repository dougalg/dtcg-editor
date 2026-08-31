import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TokenTree } from "./TokenTree.tsx";

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
						inferredType: undefined,
						description: "Small spacing",
						deprecated: undefined,
					},
					{
						kind: "token",
						name: "red",
						path: ["spacing", "red"],
						value: "#ff0000",
						declaredType: "color",
						effectiveType: "color",
						inferredType: undefined,
						description: undefined,
						deprecated: undefined,
					},
				],
			},
		],
	};
}

test("has no WCAG 2.2 AA violations rendering a mix of groups, editable, and read-only tokens", async () => {
	const { container } = render(
		<TokenTree node={treeWithGroup()} relativePath="tokens.json" />,
	);

	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});

	expect(results.violations).toEqual([]);
});

test("has no WCAG 2.2 AA violations after an edit + save round-trip (U59)", async () => {
	const fetchMock = vi
		.fn()
		.mockResolvedValue(new Response(null, { status: 200 }));
	vi.stubGlobal("fetch", fetchMock);
	const { container } = render(
		<TokenTree node={treeWithGroup()} relativePath="tokens.json" />,
	);

	async function expectAxeClean() {
		const results = await axe.run(container, {
			runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
		});
		expect(results.violations).toEqual([]);
	}

	// mid-edit: a token name draft + the Save button enabled
	const nameInput = screen.getByLabelText("small name");
	fireEvent.change(nameInput, { target: { value: "sm" } });
	await expectAxeClean();

	// after a committed edit + save: the store-wired markup rebuilt
	fireEvent.blur(nameInput);
	fireEvent.click(screen.getByRole("button", { name: /save/i }));
	await vi.waitFor(() => {
		expect(screen.getByTestId("token-spacing.sm")).toBeTruthy();
	});
	await expectAxeClean();

	vi.unstubAllGlobals();
});
