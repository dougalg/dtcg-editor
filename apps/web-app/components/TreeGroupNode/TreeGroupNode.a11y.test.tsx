import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TreeGroupNode } from "./TreeGroupNode.tsx";

type GroupNode = Extract<PlainDtcgNode, { kind: "group" }>;

const childToken: PlainDtcgNode = {
	kind: "token",
	name: "small",
	path: ["spacing", "small"],
	value: { value: 4, unit: "px" },
	declaredType: "dimension",
	effectiveType: "dimension",
	description: undefined,
	deprecated: undefined,
};

const node: GroupNode = {
	kind: "group",
	name: "spacing",
	path: ["spacing"],
	declaredType: undefined,
	effectiveType: undefined,
	description: undefined,
	deprecated: undefined,
	children: [childToken],
};

const root: GroupNode = {
	kind: "group",
	name: "",
	path: [],
	declaredType: undefined,
	effectiveType: undefined,
	description: undefined,
	deprecated: undefined,
	children: [node],
};

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("an expanded, non-root group has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<ul>
			<TreeGroupNode
				node={node}
				root={root}
				pendingEdits={new Map()}
				fieldErrors={new Map()}
				onStageEdit={vi.fn()}
				onFieldError={vi.fn()}
			/>
		</ul>,
	);
	await expectNoViolations(container);
});

test("the root group has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<TreeGroupNode
			node={root}
			root={root}
			pendingEdits={new Map()}
			fieldErrors={new Map()}
			onStageEdit={vi.fn()}
			onFieldError={vi.fn()}
		/>,
	);
	await expectNoViolations(container);
});
