import { isDtcgTokenType } from "@dtcg-editor/token-core";
import type { DtcgNode, TokenDocument } from "@dtcg-editor/token-core";

function isNodeStandard(node: DtcgNode): boolean {
	if (node.declaredType !== undefined && !isDtcgTokenType(node.declaredType)) {
		return false;
	}
	if (node.kind === "group") {
		for (const child of node.children.values()) {
			if (!isNodeStandard(child)) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Whether every node (token or group) in `document` that declares its own
 * `$type` declares a recognized DTCG type. A node with no declared `$type`
 * (inherited or untyped) is never itself non-standard — only an explicitly
 * declared, unrecognized value counts.
 */
export function isTokenDocumentStandard(document: TokenDocument): boolean {
	return isNodeStandard(document.root);
}
