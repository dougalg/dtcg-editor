import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
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

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("a dispatched token node has no WCAG 2.2 AA violations", async () => {
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

	const { container } = render(
		<ul>
			<TreeNode node={node} {...baseProps} />
		</ul>,
	);
	await expectNoViolations(container);
});

test("a dispatched group node has no WCAG 2.2 AA violations", async () => {
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

	const { container } = render(
		<ul>
			<TreeNode node={node} {...baseProps} />
		</ul>,
	);
	await expectNoViolations(container);
});
