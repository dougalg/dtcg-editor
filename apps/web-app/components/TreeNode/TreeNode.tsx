import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TreeGroupNode } from "../TreeGroupNode/TreeGroupNode.tsx";
import { TreeTokenNode } from "../TreeTokenNode/TreeTokenNode.tsx";

export interface TreeNodeProps<TNode extends PlainDtcgNode = PlainDtcgNode> {
	readonly node: TNode;
	/** The file being viewed, for `ReferencedByBadge` to tell a same-file
	 * referrer from a cross-file one. */
	readonly relativePath: string;
}

/**
 * Dispatches a tree node to its token or group renderer, based on `node.kind`.
 * Edit state is read from the `StagedEditsContext` per row (via `useTokenSlice`),
 * so this only threads `node` + `relativePath` down.
 */
export function TreeNode({ node, relativePath }: TreeNodeProps) {
	if (node.kind === "token") {
		return <TreeTokenNode node={node} relativePath={relativePath} />;
	}
	return <TreeGroupNode node={node} relativePath={relativePath} />;
}
