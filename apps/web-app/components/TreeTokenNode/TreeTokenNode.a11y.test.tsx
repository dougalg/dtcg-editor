import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { TokenTree } from "../TokenTree/TokenTree.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

function tree(node: Extract<PlainDtcgNode, { kind: "token" }>): PlainDtcgNode {
	return {
		kind: "group",
		name: "",
		path: [],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [node],
	};
}

test("has no WCAG 2.2 AA violations for a token holding a reference (resolved)", async () => {
	const resolved: ResolvedReference = {
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
	const { container } = render(
		<TokenTree
			node={tree({
				kind: "token",
				name: "text",
				path: ["text"],
				value: "{color.brand.blue}",
				declaredType: "color",
				effectiveType: "color",
				inferredType: undefined,
				description: undefined,
				deprecated: undefined,
				references: [resolved],
			})}
			relativePath="a.json"
		/>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations for a token holding an unresolvable reference", async () => {
	const resolved: ResolvedReference = {
		reference: { targetPath: ["color", "nope"], at: [], raw: "{color.nope}" },
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [],
					outcome: { kind: "unresolved", missingPath: ["color", "nope"] },
				},
				targetFile: undefined,
			},
		],
	};
	const { container } = render(
		<TokenTree
			node={tree({
				kind: "token",
				name: "text",
				path: ["text"],
				value: "{color.nope}",
				declaredType: "color",
				effectiveType: "color",
				inferredType: undefined,
				description: undefined,
				deprecated: undefined,
				references: [resolved],
			})}
			relativePath="a.json"
		/>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations for a token whose type was shape-inferred (FR-003b)", async () => {
	const { container } = render(
		<TokenTree
			node={tree({
				kind: "token",
				name: "swatch",
				path: ["swatch"],
				value: { colorSpace: "srgb", components: [0, 0, 0] },
				declaredType: undefined,
				effectiveType: "color",
				inferredType: "color",
				description: undefined,
				deprecated: undefined,
			})}
			relativePath="a.json"
		/>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations for the non-reference path (regression check)", async () => {
	const { container } = render(
		<TokenTree
			node={tree({
				kind: "token",
				name: "gap",
				path: ["gap"],
				value: { value: 1, unit: "rem" },
				declaredType: "dimension",
				effectiveType: "dimension",
				inferredType: undefined,
				description: undefined,
				deprecated: undefined,
			})}
			relativePath="a.json"
		/>,
	);
	await expectNoViolations(container);
});
