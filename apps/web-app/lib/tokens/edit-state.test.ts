import { test } from "vitest";
import assert from "node:assert/strict";
import {
  applyEditsToPlainNode,
  checkRenameAvailable,
  findSiblings,
  validateDimensionValue,
} from "./edit-state.ts";
import type { PlainDtcgNode } from "./plain-node.ts";

function tokenNode(name: string, path: readonly string[], value: unknown): PlainDtcgNode {
  return {
    kind: "token",
    name,
    path,
    value,
    declaredType: "dimension",
    effectiveType: "dimension",
    description: undefined,
    deprecated: undefined,
  };
}

function tree(): PlainDtcgNode {
  return {
    kind: "group",
    name: "",
    path: [],
    declaredType: undefined,
    effectiveType: undefined,
    description: undefined,
    deprecated: undefined,
    children: [
      {
        kind: "group",
        name: "spacing",
        path: ["spacing"],
        declaredType: undefined,
        effectiveType: undefined,
        description: undefined,
        deprecated: undefined,
        children: [
          tokenNode("small", ["spacing", "small"], { value: 4, unit: "px" }),
          tokenNode("large", ["spacing", "large"], { value: 16, unit: "px" }),
        ],
      },
    ],
  };
}

test("applyEditsToPlainNode patches a token's value", () => {
  const result = applyEditsToPlainNode(tree(), [{ path: ["spacing", "small"], value: { value: 8, unit: "px" } }]);
  const spacing = result.kind === "group" ? result.children[0] : undefined;
  const small = spacing?.kind === "group" ? spacing.children[0] : undefined;
  assert.ok(small?.kind === "token");
  assert.deepEqual(small.value, { value: 8, unit: "px" });
});

test("applyEditsToPlainNode renames a token and updates its path", () => {
  const result = applyEditsToPlainNode(tree(), [{ path: ["spacing", "small"], name: "tiny" }]);
  const spacing = result.kind === "group" ? result.children[0] : undefined;
  const renamed = spacing?.kind === "group" ? spacing.children[0] : undefined;
  assert.ok(renamed?.kind === "token");
  assert.equal(renamed.name, "tiny");
  assert.deepEqual(renamed.path, ["spacing", "tiny"]);
});

test("applyEditsToPlainNode leaves untouched siblings alone", () => {
  const result = applyEditsToPlainNode(tree(), [{ path: ["spacing", "small"], value: { value: 8, unit: "px" } }]);
  const spacing = result.kind === "group" ? result.children[0] : undefined;
  const large = spacing?.kind === "group" ? spacing.children[1] : undefined;
  assert.ok(large?.kind === "token");
  assert.deepEqual(large.value, { value: 16, unit: "px" });
});

test("checkRenameAvailable allows keeping the current name", () => {
  const siblings = [tokenNode("large", ["spacing", "large"], { value: 16, unit: "px" })];
  assert.equal(checkRenameAvailable(siblings, "small", "small"), true);
});

test("checkRenameAvailable rejects a name already used by a sibling", () => {
  const siblings = [tokenNode("large", ["spacing", "large"], { value: 16, unit: "px" })];
  assert.equal(checkRenameAvailable(siblings, "large", "small"), false);
});

test("checkRenameAvailable allows a name no sibling uses", () => {
  const siblings = [tokenNode("large", ["spacing", "large"], { value: 16, unit: "px" })];
  assert.equal(checkRenameAvailable(siblings, "medium", "small"), true);
});

test("findSiblings returns the other children of the parent group, excluding the node itself", () => {
  const siblings = findSiblings(tree(), ["spacing", "small"]);
  assert.equal(siblings.length, 1);
  assert.ok(siblings.some((sibling) => sibling.name === "large"));
  assert.ok(!siblings.some((sibling) => sibling.name === "small"));
});

test("validateDimensionValue accepts a valid value", () => {
  const result = validateDimensionValue({ value: 4, unit: "px" });
  assert.equal(result.ok, true);
});

test("validateDimensionValue rejects an invalid value", () => {
  const result = validateDimensionValue({ value: 4 });
  assert.equal(result.ok, false);
});
