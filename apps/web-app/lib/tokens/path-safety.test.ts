import { test } from "vitest";
import assert from "node:assert/strict";
import { PathTraversalError, resolveSafeTokenPath } from "./path-safety.ts";

const root = "/configured/tokens/root";

test("resolves a valid nested relative path", () => {
	const result = resolveSafeTokenPath(root, "nested/spacing.json");
	assert.equal(result.isOk(), true);
	if (result.isOk()) {
		assert.equal(result.value, "/configured/tokens/root/nested/spacing.json");
	}
});

test("accepts the root itself", () => {
	const result = resolveSafeTokenPath(root, ".");
	assert.equal(result.isOk(), true);
	if (result.isOk()) {
		assert.equal(result.value, root);
	}
});

test("rejects a path that traverses outside the root", () => {
	const result = resolveSafeTokenPath(root, "../../etc/passwd");
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof PathTraversalError);
	}
});

test("rejects an absolute path segment that escapes the root", () => {
	const result = resolveSafeTokenPath(root, "/etc/passwd");
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof PathTraversalError);
	}
});

test("rejects a path that traverses out and back to an unrelated sibling", () => {
	const result = resolveSafeTokenPath(root, "../sibling/file.json");
	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.ok(result.error instanceof PathTraversalError);
	}
});
