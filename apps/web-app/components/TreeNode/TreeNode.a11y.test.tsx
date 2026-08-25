import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { ClientEdit } from "../../lib/tokens/edit-state.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TreeNode } from "./TreeNode.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

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

/**
 * `TreeNode` is a pure `node.kind` dispatch — it renders no DOM of its own,
 * only `TreeTokenNode`/`TreeGroupNode`. Principle X requires an explicit
 * test asserting "no accessibility semantics of its own" for a component
 * like this, rather than a silent exemption from a11y coverage; these two
 * cases (one per dispatch branch) are that assertion, not a check on
 * TreeTokenNode/TreeGroupNode's own a11y behavior, which each already have
 * their own dedicated a11y test files.
 */
test("has no WCAG 2.2 AA violations dispatching to TreeTokenNode", async () => {
	const { container } = renderNode({
		kind: "token",
		name: "brand-blue",
		path: ["brand-blue"],
		value: { colorSpace: "srgb", components: [0, 0, 1] },
		declaredType: "color",
		effectiveType: "color",
		inferredType: undefined,
		description: undefined,
		deprecated: undefined,
	});
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations dispatching to TreeGroupNode", async () => {
	const { container } = renderNode({
		kind: "group",
		name: "color",
		path: ["color"],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [],
	});
	await expectNoViolations(container);
});
