import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TreeTokenNode } from "./TreeTokenNode.tsx";

type TokenNode = Extract<PlainDtcgNode, { kind: "token" }>;

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

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("a valid, editable token has no WCAG 2.2 AA violations", async () => {
	const node: TokenNode = {
		kind: "token",
		name: "small",
		path: ["small"],
		value: { value: 4, unit: "px" },
		declaredType: "dimension",
		effectiveType: "dimension",
		description: undefined,
		deprecated: undefined,
	};

	const { container } = render(
		<ul>
			<TreeTokenNode
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

test("an invalid, read-only token with an error alert has no WCAG 2.2 AA violations", async () => {
	const node: TokenNode = {
		kind: "token",
		name: "broken",
		path: ["broken"],
		value: { value: 4 },
		declaredType: "dimension",
		effectiveType: "dimension",
		description: undefined,
		deprecated: undefined,
	};

	const { container } = render(
		<ul>
			<TreeTokenNode
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
