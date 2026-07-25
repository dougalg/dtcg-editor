import { test } from "node:test";
import assert from "node:assert/strict";
import { PathTraversalError, resolveSafeTokenPath } from "./path-safety.ts";

const root = "/configured/tokens/root";

test("resolves a valid nested relative path", () => {
  const resolved = resolveSafeTokenPath(root, "nested/spacing.json");
  assert.equal(resolved, "/configured/tokens/root/nested/spacing.json");
});

test("accepts the root itself", () => {
  assert.equal(resolveSafeTokenPath(root, "."), root);
});

test("rejects a path that traverses outside the root", () => {
  assert.throws(() => resolveSafeTokenPath(root, "../../etc/passwd"), PathTraversalError);
});

test("rejects an absolute path segment that escapes the root", () => {
  assert.throws(() => resolveSafeTokenPath(root, "/etc/passwd"), PathTraversalError);
});

test("rejects a path that traverses out and back to an unrelated sibling", () => {
  assert.throws(() => resolveSafeTokenPath(root, "../sibling/file.json"), PathTraversalError);
});
