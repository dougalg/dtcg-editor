import { NodeMetadataSchema, RawNodeSchema } from "./schema.ts";
import type { DtcgNode, GroupNode, TokenDocument, TokenNode } from "./types.ts";

/** Thrown by `parseTokenFile` for any structural or schema problem, at any depth. */
export class TokenParseError extends Error {
  readonly path: readonly string[];

  constructor(message: string, path: readonly string[] = []) {
    super(message);
    this.name = "TokenParseError";
    this.path = path;
  }
}

function describePath(path: readonly string[]): string {
  return path.length > 0 ? path.join(".") : "<root>";
}

const KNOWN_METADATA_KEYS = new Set(["$type", "$description", "$deprecated"]);

function parseNode(raw: unknown, name: string, path: readonly string[]): DtcgNode {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new TokenParseError(
      `Expected an object at "${describePath(path)}", got ${Array.isArray(raw) ? "array" : typeof raw}`,
      path,
    );
  }

  const envelope = RawNodeSchema.safeParse(raw);
  if (!envelope.success) {
    throw new TokenParseError(`Invalid node at "${describePath(path)}"`, path);
  }
  const obj = envelope.data;

  const metadata = NodeMetadataSchema.safeParse(obj);
  if (!metadata.success) {
    const reasons = metadata.error.issues.map((issue) => issue.message).join(", ");
    throw new TokenParseError(`Invalid metadata at "${describePath(path)}": ${reasons}`, path);
  }
  const { $type: declaredType, $description: description, $deprecated: deprecated } = metadata.data;

  const extensions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$") && key !== "$value" && !KNOWN_METADATA_KEYS.has(key)) {
      // Preserves $extensions and any other unrecognized "$"-prefixed field
      // verbatim, per this repo's round-trip fidelity constraint.
      extensions[key] = value;
    }
  }

  const isToken = Object.prototype.hasOwnProperty.call(obj, "$value");

  if (isToken) {
    const hasChildKeys = Object.keys(obj).some((key) => !key.startsWith("$"));
    if (hasChildKeys) {
      throw new TokenParseError(
        `Token node at "${describePath(path)}" has "$value" and child keys at the same time, which is not valid DTCG`,
        path,
      );
    }
    const token: TokenNode = {
      kind: "token",
      name,
      path,
      value: obj["$value"],
      declaredType,
      description,
      deprecated,
      extensions,
    };
    return token;
  }

  const children = new Map<string, DtcgNode>();
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) {
      continue;
    }
    children.set(key, parseNode(value, key, [...path, key]));
  }

  const group: GroupNode = {
    kind: "group",
    name,
    path,
    declaredType,
    description,
    deprecated,
    extensions,
    children,
  };
  return group;
}

/**
 * The sanctioned entry point for turning raw DTCG token file contents into a
 * typed `TokenDocument`. Takes the file's raw text (not pre-parsed JSON) —
 * this is the only place `JSON.parse` should be called on token content.
 */
export function parseTokenFile(raw: unknown): TokenDocument {
  if (typeof raw !== "string") {
    throw new TokenParseError(`Expected token file contents as a string, got ${typeof raw}`, []);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new TokenParseError(`Invalid JSON: ${reason}`, []);
  }

  const root = parseNode(parsed, "", []);
  if (root.kind !== "group") {
    throw new TokenParseError('A DTCG token file\'s root must be a group (an object without a top-level "$value")', []);
  }
  return { root };
}
