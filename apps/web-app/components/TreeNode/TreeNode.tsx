import type { ClientEdit } from "../../lib/tokens/edit-state.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { TreeGroupNode } from "../TreeGroupNode/TreeGroupNode.tsx";
import { TreeTokenNode } from "../TreeTokenNode/TreeTokenNode.tsx";

export interface FieldErrors {
	readonly name: string | undefined;
	readonly value: string | undefined;
}

export type EditablePatch = Partial<
	Pick<ClientEdit, "name" | "value" | "description">
>;

export interface TreeNodeProps<TNode extends PlainDtcgNode = PlainDtcgNode> {
	readonly node: TNode;
	readonly root: PlainDtcgNode;
	/** The file being viewed, for `ReferencedByBadge` to tell a same-file
	 * referrer from a cross-file one. */
	readonly relativePath: string;
	readonly pendingEdits: ReadonlyMap<string, ClientEdit>;
	readonly fieldErrors: ReadonlyMap<string, FieldErrors>;
	readonly onStageEdit: (path: readonly string[], patch: EditablePatch) => void;
	readonly onFieldError: (path: readonly string[], errors: FieldErrors) => void;
}

/** Dispatches a tree node to its token or group renderer, based on `node.kind`. */
export function TreeNode({ node, ...rest }: TreeNodeProps) {
	if (node.kind === "token") {
		return <TreeTokenNode node={node} {...rest} />;
	}
	return <TreeGroupNode node={node} {...rest} />;
}
