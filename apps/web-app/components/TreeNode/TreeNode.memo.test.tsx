import { fireEvent, render, screen } from "@testing-library/react";
import { useReducer } from "react";
import { expect, test, vi } from "vitest";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";

/**
 * `TreeNode`'s only job is memoised dispatch — proving it does NOT re-render
 * its row when a parent re-renders with the same `node` needs the two row
 * renderers replaced by render-counting spies. Kept in its own file since
 * `vi.mock` is file-scoped.
 */
vi.mock("../TreeTokenNode/TreeTokenNode.tsx", () => ({
	TreeTokenNode: vi.fn(() => <li data-testid="token-row" />),
}));
vi.mock("../TreeGroupNode/TreeGroupNode.tsx", () => ({
	TreeGroupNode: vi.fn(() => <li data-testid="group-row" />),
}));

const { TreeNode } = await import("./TreeNode.tsx");
const { TreeTokenNode } = await import("../TreeTokenNode/TreeTokenNode.tsx");

function tokenNode(): PlainDtcgNode {
	return {
		kind: "token",
		name: "brand-blue",
		path: ["brand-blue"],
		value: { value: 4, unit: "px" },
		declaredType: "dimension",
		effectiveType: "dimension",
		inferredType: undefined,
		description: undefined,
		deprecated: undefined,
	};
}

test("TreeNode is memoised: a parent re-render with the same node does not re-render the row", () => {
	const node = tokenNode();

	function Harness() {
		const [count, bump] = useReducer((n: number) => n + 1, 0);
		return (
			<ul>
				<li>
					<button type="button" onClick={bump}>
						bump {count}
					</button>
				</li>
				<TreeNode node={node} relativePath="a.json" />
			</ul>
		);
	}

	render(<Harness />);
	expect(TreeTokenNode).toHaveBeenCalledTimes(1);

	fireEvent.click(screen.getByRole("button"));

	expect(TreeTokenNode).toHaveBeenCalledTimes(1);
});
