import type { DtcgNode, GroupNode } from "./types.ts";

/**
 * Resolves a node's effective `$type`: its own declared type if present,
 * otherwise the nearest ancestor group's declared type, otherwise
 * `undefined`. `ancestors` must be ordered root-first, ending with the
 * node's immediate parent.
 */
export function resolveEffectiveType(node: DtcgNode, ancestors: readonly GroupNode[]): string | undefined {
  if (node.declaredType !== undefined) {
    return node.declaredType;
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (ancestor !== undefined && ancestor.declaredType !== undefined) {
      return ancestor.declaredType;
    }
  }
  return undefined;
}
