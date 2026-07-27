import { fromThrowable, type Result } from "neverthrow";
import type { DtcgNode, TokenDocument } from "./types.ts";

/** Returned by `serializeTokenFile` if the underlying `JSON.stringify` call fails. */
export class TokenSerializeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenSerializeError";
  }
}

function nodeToRaw(node: DtcgNode): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  if (node.declaredType !== undefined) {
    raw["$type"] = node.declaredType;
  }
  if (node.description !== undefined) {
    raw["$description"] = node.description;
  }
  if (node.deprecated !== undefined) {
    raw["$deprecated"] = node.deprecated;
  }
  for (const [key, value] of Object.entries(node.extensions)) {
    raw[key] = value;
  }

  if (node.kind === "token") {
    raw["$value"] = node.value;
    return raw;
  }

  for (const [key, child] of node.children) {
    raw[key] = nodeToRaw(child);
  }
  return raw;
}

const stringify = fromThrowable(
  (raw: unknown) => JSON.stringify(raw, null, 2),
  (cause) =>
    new TokenSerializeError(
      `Failed to serialize token document: ${cause instanceof Error ? cause.message : String(cause)}`,
    ),
);

/**
 * The inverse of `parseTokenFile`: turns a `TokenDocument` back into DTCG
 * JSON text. Per this repo's Round-Trip Fidelity constraint, formatting and
 * key ordering may normalize, but the data doesn't — a node with no pending
 * edits serializes back with exactly the `value`/extensions `parseTokenFile`
 * originally produced for it.
 */
export function serializeTokenFile(document: TokenDocument): Result<string, TokenSerializeError> {
  return stringify(nodeToRaw(document.root));
}
