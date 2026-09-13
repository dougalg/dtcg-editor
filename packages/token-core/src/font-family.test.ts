import assert from "node:assert/strict";
import { test } from "node:test";
import { FontFamilyValueSchema } from "./font-family.ts";

test("accepts a single string", () => {
	const result = FontFamilyValueSchema.safeParse("Helvetica");
	assert.equal(result.success, true);
});

test("accepts an array of strings", () => {
	const result = FontFamilyValueSchema.safeParse([
		"Helvetica",
		"Arial",
		"sans-serif",
	]);
	assert.equal(result.success, true);
});

test("accepts an empty array", () => {
	const result = FontFamilyValueSchema.safeParse([]);
	assert.equal(result.success, true);
});

test("rejects an array containing a non-string element", () => {
	const result = FontFamilyValueSchema.safeParse(["Helvetica", 42]);
	assert.equal(result.success, false);
});

test("rejects a bare number", () => {
	const result = FontFamilyValueSchema.safeParse(42);
	assert.equal(result.success, false);
});

test("rejects null", () => {
	const result = FontFamilyValueSchema.safeParse(null);
	assert.equal(result.success, false);
});

test("rejects a plain object", () => {
	const result = FontFamilyValueSchema.safeParse({ not: "valid" });
	assert.equal(result.success, false);
});
