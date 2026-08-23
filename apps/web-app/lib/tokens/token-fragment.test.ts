import assert from "node:assert/strict";
import { test } from "vitest";
import {
	decodeTokenFragment,
	fileHref,
	isSameFileHref,
	tokenFragment,
	tokenHref,
} from "./token-fragment.ts";

test("fileHref encodes a simple relative path", () => {
	assert.equal(fileHref("colors.json"), "/tokens/colors.json");
});

test("fileHref encodes each path segment, preserving directory structure", () => {
	assert.equal(
		fileHref("nested/deeper/colors.json"),
		"/tokens/nested/deeper/colors.json",
	);
});

test("fileHref percent-encodes a segment needing it", () => {
	assert.equal(fileHref("a b/c.json"), "/tokens/a%20b/c.json");
});

test("tokenFragment joins path segments with dots", () => {
	assert.equal(tokenFragment(["color", "brand", "blue"]), "color.brand.blue");
});

test("tokenFragment percent-encodes a segment containing a dot-adjacent character", () => {
	assert.equal(tokenFragment(["a b", "c"]), "a%20b.c");
});

test("tokenHref combines the file href and the fragment", () => {
	assert.equal(
		tokenHref("colors.json", ["color", "brand", "blue"]),
		"/tokens/colors.json#color.brand.blue",
	);
});

test("decodeTokenFragment round-trips with tokenFragment", () => {
	const path = ["color", "brand", "blue"];
	assert.deepEqual(decodeTokenFragment(tokenFragment(path)), path);
});

test("decodeTokenFragment strips a leading #", () => {
	assert.deepEqual(decodeTokenFragment("#color.brand.blue"), [
		"color",
		"brand",
		"blue",
	]);
});

test("decodeTokenFragment decodes a percent-encoded segment", () => {
	assert.deepEqual(decodeTokenFragment("a%20b.c"), ["a b", "c"]);
});

test("decodeTokenFragment returns an empty array for an empty fragment", () => {
	assert.deepEqual(decodeTokenFragment(""), []);
	assert.deepEqual(decodeTokenFragment("#"), []);
});

test("decodeTokenFragment does not throw for a malformed percent-encoding", () => {
	assert.doesNotThrow(() => decodeTokenFragment("%zz"));
});

test("isSameFileHref is true for a fragment-only jump within the current file", () => {
	assert.equal(
		isSameFileHref("/tokens/colors.json#color.brand.blue", "colors.json"),
		true,
	);
});

test("isSameFileHref is true for the bare file href with no fragment", () => {
	assert.equal(isSameFileHref("/tokens/colors.json", "colors.json"), true);
});

test("isSameFileHref is false for a different file", () => {
	assert.equal(
		isSameFileHref("/tokens/dark.json#color.brand.blue", "colors.json"),
		false,
	);
});

test("isSameFileHref is false for a file whose name is a prefix of the current one", () => {
	// Guards the naive `href.startsWith(currentFileHref)` version of this
	// check, which would wrongly treat "colors-dark.json" as the same file
	// as "colors.json".
	assert.equal(
		isSameFileHref("/tokens/colors-dark.json#x", "colors.json"),
		false,
	);
});
