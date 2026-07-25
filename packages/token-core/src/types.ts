/**
 * A DTCG token: a leaf node identified by the presence of `$value`.
 */
export interface TokenNode {
  readonly kind: "token";
  readonly name: string;
  readonly path: readonly string[];
  readonly value: unknown;
  readonly declaredType: string | undefined;
  readonly description: string | undefined;
  readonly deprecated: boolean | string | undefined;
  /** Unrecognized "$"-prefixed fields, preserved verbatim (round-trip fidelity). */
  readonly extensions: Readonly<Record<string, unknown>>;
}

/**
 * A DTCG group: a container of nested tokens/groups, identified by the
 * absence of `$value`. `$type` on a group is inherited by descendants that
 * don't declare their own (see `resolveEffectiveType`).
 */
export interface GroupNode {
  readonly kind: "group";
  readonly name: string;
  readonly path: readonly string[];
  readonly declaredType: string | undefined;
  readonly description: string | undefined;
  readonly deprecated: boolean | string | undefined;
  readonly extensions: Readonly<Record<string, unknown>>;
  readonly children: ReadonlyMap<string, DtcgNode>;
}

export type DtcgNode = TokenNode | GroupNode;

/** The parsed, typed result of a single DTCG token file. The root is always a group. */
export interface TokenDocument {
  readonly root: GroupNode;
}
