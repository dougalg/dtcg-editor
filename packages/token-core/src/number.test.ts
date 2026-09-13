import assert from "node:assert/strict";
import { test } from "node:test";
import { NumberValueSchema } from "./number.ts";

test("accepts a positive integer", () => {
	const result = NumberValueSchema.safeParse(2);
	assert.equal(result.success, true);
});

test("accepts a positive fraction", () => {
	const result = NumberValueSchema.safeParse(1.5);
	assert.equal(result.success, true);
});

test("accepts zero", () => {
	const result = NumberValueSchema.safeParse(0);
	assert.equal(result.success, true);
});

test("accepts a negative number", () => {
	const result = NumberValueSchema.safeParse(-1);
	assert.equal(result.success, true);
});

test("accepts a negative fraction", () => {
	const result = NumberValueSchema.safeParse(-0.5);
	assert.equal(result.success, true);
});

test("rejects NaN", () => {
	const result = NumberValueSchema.safeParse(Number.NaN);
	assert.equal(result.success, false);
});

test("rejects Infinity", () => {
	const result = NumberValueSchema.safeParse(Number.POSITIVE_INFINITY);
	assert.equal(result.success, false);
});

test("rejects -Infinity", () => {
	const result = NumberValueSchema.safeParse(Number.NEGATIVE_INFINITY);
	assert.equal(result.success, false);
});

test("rejects a string", () => {
	const result = NumberValueSchema.safeParse("1.5");
	assert.equal(result.success, false);
});

test("rejects an object", () => {
	const result = NumberValueSchema.safeParse({ not: "valid" });
	assert.equal(result.success, false);
});
