import { expect, test } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { TokenTree } from "./TokenTree.tsx";
import { WCAG_22_AA_TAGS } from "../lib/a11y/wcag-tags.ts";
import type { PlainDtcgNode } from "../lib/tokens/plain-node.ts";

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
