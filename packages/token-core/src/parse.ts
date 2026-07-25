import { err, fromThrowable, ok, type Result } from "neverthrow";
import { NodeMetadataSchema, RawNodeSchema } from "./schema.ts";
import type { DtcgNode, GroupNode, TokenDocument, TokenNode } from "./types.ts";

/** Returned by `parseTokenFile` for any structural or schema problem, at any depth. */
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

function parseNode(raw: unknown, name: string, path: readonly string[]): Result<DtcgNode, TokenParseError> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return err(
      new TokenParseError(
        `Expected an object at "${describePath(path)}", got ${Array.isArray(raw) ? "array" : typeof raw}`,
        path,
      ),
    );
  }

  const envelope = RawNodeSchema.safeParse(raw);
  if (!envelope.success) {
    return err(new TokenParseError(`Invalid node at "${describePath(path)}"`, path));
  }
  const obj = envelope.data;

  const metadata = NodeMetadataSchema.safeParse(obj);
  if (!metadata.success) {
    const reasons = metadata.error.issues.map((issue) => issue.message).join(", ");
    return err(new TokenParseError(`Invalid metadata at "${describePath(path)}": ${reasons}`, path));
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
      return err(
        new TokenParseError(
          `Token node at "${describePath(path)}" has "$value" and child keys at the same time, which is not valid DTCG`,
          path,
        ),
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
    return ok(token);
  }

  const children = new Map<string, DtcgNode>();
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) {
      continue;
    }
    const result = parseNode(value, key, [...path, key]);
    if (result.isErr()) {
      return result;
    }
    children.set(key, result.value);
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
  return ok(group);
}

const parseJson = fromThrowable(
  (raw: string) => JSON.parse(raw) as unknown,
  (cause) => new TokenParseError(`Invalid JSON: ${cause instanceof Error ? cause.message : String(cause)}`, []),
);

/**
 * The sanctioned entry point for turning raw DTCG token file contents into a
 * typed `TokenDocument`. Takes the file's raw text (not pre-parsed JSON) —
 * this is the only place `JSON.parse` should be called on token content.
 */
export function parseTokenFile(raw: unknown): Result<TokenDocument, TokenParseError> {
  if (typeof raw !== "string") {
    return err(new TokenParseError(`Expected token file contents as a string, got ${typeof raw}`, []));
  }

  return parseJson(raw).andThen((parsed) => parseNode(parsed, "", [])).andThen((root) => {
    if (root.kind !== "group") {
      return err(
        new TokenParseError('A DTCG token file\'s root must be a group (an object without a top-level "$value")', []),
      );
    }
    return ok({ root });
  });
}
