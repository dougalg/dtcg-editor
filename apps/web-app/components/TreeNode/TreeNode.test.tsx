import { render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { ClientEdit } from "../../lib/tokens/edit-state.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { TreeNode } from "./TreeNode.tsx";

afterEach(() => {
	document.body.innerHTML = "";
});

const noopEdits: ReadonlyMap<string, ClientEdit> = new Map();
const noopErrors: ReadonlyMap<
	string,
	{ name: string | undefined; value: string | undefined }
> = new Map();
function noopStage() {}
function noopFieldError() {}

function renderNode(node: PlainDtcgNode) {
	return render(
		<ul>
			<TreeNode
				node={node}
				root={node}
				relativePath="a.json"
				pendingEdits={noopEdits}
				fieldErrors={noopErrors}
				onStageEdit={noopStage}
				onFieldError={noopFieldError}
			/>
		</ul>,
	);
}

test("dispatches a token node to TreeTokenNode", () => {
	renderNode({
		kind: "token",
		name: "brand-blue",
		path: ["brand-blue"],
		value: { colorSpace: "srgb", components: [0, 0, 1] },
		declaredType: "color",
		effectiveType: "color",
		description: undefined,
		deprecated: undefined,
	});
	expect(screen.getByLabelText("brand-blue name")).toBeTruthy();
});

test("dispatches a group node to TreeGroupNode", () => {
	renderNode({
		kind: "group",
		name: "color",
		path: ["color"],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [],
	});
	expect(screen.getByDisplayValue("color")).toBeTruthy();
});

test("the reference path reaches TokenReferenceValue's resolved rendering", () => {
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
	renderNode({
		kind: "token",
		name: "text",
		path: ["text"],
		value: "{color.brand.blue}",
		declaredType: "color",
		effectiveType: "color",
		description: undefined,
		deprecated: undefined,
		references: [resolved],
	});
	expect(screen.getByText("{color.brand.blue}")).toBeTruthy();
	expect(screen.getByText(/srgb/)).toBeTruthy();
	expect(screen.queryByRole("alert")).toBeNull();
});
