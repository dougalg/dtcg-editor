import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TreeNode } from "./TreeNode.tsx";

const root: PlainDtcgNode = {
	kind: "group",
	name: "",
	path: [],
	declaredType: undefined,
	effectiveType: undefined,
	description: undefined,
	deprecated: undefined,
	children: [],
};

const baseProps = {
	root,
	pendingEdits: new Map(),
	fieldErrors: new Map(),
	onStageEdit: vi.fn(),
	onFieldError: vi.fn(),
};

test("dispatches a token node to TreeTokenNode", () => {
	const node: PlainDtcgNode = {
		kind: "token",
		name: "swatch",
		path: ["swatch"],
		value: "#ff0000",
		declaredType: "not-a-real-type",
		effectiveType: "not-a-real-type",
		description: undefined,
		deprecated: undefined,
	};

	render(<TreeNode node={node} {...baseProps} />);

	expect(screen.getByLabelText("swatch name")).toBeTruthy();
});

test("dispatches a group node to TreeGroupNode", () => {
	const node: PlainDtcgNode = {
		kind: "group",
		name: "spacing",
		path: ["spacing"],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [],
	};

	render(<TreeNode node={node} {...baseProps} />);

	expect(screen.getByLabelText("Group Name:")).toBeTruthy();
});
