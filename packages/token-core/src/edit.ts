import { err, ok, type Result } from "neverthrow";
import { findNode } from "./resolve-type.ts";
import type { DtcgNode, GroupNode, TokenDocument, TokenNode } from "./types.ts";

/** Returned by `applyTokenEdits` for any edit that can't be applied. */
export class TokenEditError extends Error {
  readonly path: readonly string[];

  constructor(message: string, path: readonly string[]) {
    super(message);
    this.name = "TokenEditError";
    this.path = path;
  }
}

/**
 * A single token patch. `path` identifies the token by its location in the
 * tree *before* this (or any earlier, already-applied) edit; `name`, if
 * given and different from the token's current name, renames it (rejected
 * on a sibling collision). `value`/`description`, if given, replace those
 * fields as-is — this module has no concept of what a "valid" value is for
 * any particular token type; that validation happens before an edit reaches
 * here.
 */
export interface TokenEdit {
  readonly path: readonly string[];
  readonly name?: string;
  readonly value?: unknown;
  readonly description?: string;
}

function describePath(path: readonly string[]): string {
  return path.length > 0 ? path.join(".") : "<root>";
}

function withReplacedChild(group: GroupNode, oldKey: string, newKey: string, newChild: DtcgNode): GroupNode {
  const children = new Map(group.children);
  children.delete(oldKey);
  children.set(newKey, newChild);
  return { ...group, children };
}

// Rebuilds `ancestors[index..]`, bottom-up, with the leaf's key swapped from
// `oldKey` to `newKey`. Returns `undefined` only if `index` is out of range —
// callers only ever pass in-range indices, but this returns rather than
// throws/asserts so a violated invariant surfaces as a normal `TokenEditError`
// through `applyOneEdit`'s `Result`, not an uncaught exception.
function rebuildAncestorChain(
  ancestors: readonly GroupNode[],
  index: number,
  oldKey: string,
  newKey: string,
  newNode: DtcgNode,
): GroupNode | undefined {
  const current = ancestors[index];
  if (current === undefined) {
    return undefined;
  }

  if (index === ancestors.length - 1) {
    return withReplacedChild(current, oldKey, newKey, newNode);
  }

  const nextAncestor = ancestors[index + 1];
  if (nextAncestor === undefined) {
    return undefined;
  }
  const updatedChild = rebuildAncestorChain(ancestors, index + 1, oldKey, newKey, newNode);
  if (updatedChild === undefined) {
    return undefined;
  }
  return withReplacedChild(current, nextAncestor.name, nextAncestor.name, updatedChild);
}

function applyOneEdit(root: GroupNode, edit: TokenEdit): Result<GroupNode, TokenEditError> {
  const located = findNode(root, edit.path);
  if (located === undefined) {
    return err(new TokenEditError(`No token found at "${describePath(edit.path)}"`, edit.path));
  }
  if (located.node.kind !== "token") {
    return err(new TokenEditError(`Node at "${describePath(edit.path)}" is a group, not a token`, edit.path));
  }
  // `located.node.kind === "token"` guarantees `edit.path` is non-empty (the
  // document root is always a group), so `located.ancestors` always has at
  // least one element here — but this is still checked, not asserted, since
  // `@typescript-eslint/no-non-null-assertion` bans `!` outright in this repo.
  const parent = located.ancestors[located.ancestors.length - 1];
  if (parent === undefined) {
    return err(new TokenEditError(`Cannot edit the document root`, edit.path));
  }

  const currentName = located.node.name;
  const newName = edit.name ?? currentName;
  if (newName !== currentName && parent.children.has(newName)) {
    return err(
      new TokenEditError(`"${newName}" already exists alongside "${describePath(edit.path)}"`, edit.path),
    );
  }

  const patchedToken: TokenNode = {
    ...located.node,
    name: newName,
    path: [...located.node.path.slice(0, -1), newName],
    value: edit.value ?? located.node.value,
    description: edit.description ?? located.node.description,
  };

  const newRoot = rebuildAncestorChain(located.ancestors, 0, currentName, newName, patchedToken);
  if (newRoot === undefined) {
    return err(new TokenEditError(`Internal error rebuilding the tree for "${describePath(edit.path)}"`, edit.path));
  }
  return ok(newRoot);
}

/**
 * Applies a batch of edits to a `TokenDocument`, producing a new,
 * immutably-rebuilt tree. Edits are applied in order against a
 * continuously-updated tree, so later edits in the same batch see the
 * effects of earlier ones.
 */
export function applyTokenEdits(
  document: TokenDocument,
  edits: readonly TokenEdit[],
): Result<TokenDocument, TokenEditError> {
  let root = document.root;

  for (const edit of edits) {
    const result = applyOneEdit(root, edit);
    if (result.isErr()) {
      return err(result.error);
    }
    root = result.value;
  }

  return ok({ root });
}
