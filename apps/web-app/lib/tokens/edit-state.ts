import { dimensionTokenType } from "@dtcg-editor/token-type-dimension";
import type { DimensionValue } from "@dtcg-editor/token-type-dimension";
import type { PlainDtcgNode } from "./plain-node.ts";

/** A single staged (not yet saved) edit to one token, identified by its original path. */
export interface ClientEdit {
  readonly path: readonly string[];
  readonly name?: string;
  readonly value?: unknown;
  readonly description?: string;
}

export type DimensionValidationResult = { readonly ok: true; readonly value: DimensionValue } | { readonly ok: false; readonly error: string };

/**
 * Validates a raw value against the Dimension contract's schema. Returns a
 * plain discriminated union rather than a `neverthrow` `Result` — this
 * repo's Error Handling constraint governs engine/library code, and
 * explicitly leaves UI-layer `Result` consumption undefined, so this is a
 * feature-local choice for wiring validation into component state.
 */
export function validateDimensionValue(raw: unknown): DimensionValidationResult {
  const result = dimensionTokenType.valueSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((issue) => issue.message).join(", ") };
  }
  return { ok: true, value: result.data };
}

function pathKey(path: readonly string[]): string {
  return path.join(".");
}

function findByPath(node: PlainDtcgNode, path: readonly string[]): PlainDtcgNode | undefined {
  if (pathKey(node.path) === pathKey(path)) {
    return node;
  }
  if (node.kind !== "group") {
    return undefined;
  }
  for (const child of node.children) {
    const found = findByPath(child, path);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

/** The other nodes sharing `path`'s parent group (used for rename-collision checks) — excludes the node at `path` itself. */
export function findSiblings(root: PlainDtcgNode, path: readonly string[]): readonly PlainDtcgNode[] {
  const parent = findByPath(root, path.slice(0, -1));
  if (parent === undefined || parent.kind !== "group") {
    return [];
  }
  return parent.children.filter((child) => pathKey(child.path) !== pathKey(path));
}

/** Whether `name` is free to rename a token to, given its current siblings and its own current name. */
export function checkRenameAvailable(siblings: readonly PlainDtcgNode[], name: string, currentName: string): boolean {
  if (name === currentName) {
    return true;
  }
  return !siblings.some((sibling) => sibling.name === name);
}

function applyEditToNode(node: PlainDtcgNode, edit: ClientEdit): PlainDtcgNode {
  if (pathKey(node.path) === pathKey(edit.path)) {
    if (node.kind !== "token") {
      return node;
    }
    const newName = edit.name ?? node.name;
    return {
      ...node,
      name: newName,
      path: [...node.path.slice(0, -1), newName],
      value: edit.value ?? node.value,
      description: edit.description ?? node.description,
    };
  }

  if (node.kind === "group") {
    return {
      ...node,
      children: node.children.map((child) => applyEditToNode(child, edit)),
    };
  }

  return node;
}

/** Applies a batch of edits to a client-side `PlainDtcgNode` tree, producing a new tree. */
export function applyEditsToPlainNode(root: PlainDtcgNode, edits: readonly ClientEdit[]): PlainDtcgNode {
  return edits.reduce((current, edit) => applyEditToNode(current, edit), root);
}
