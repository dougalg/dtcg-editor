import assert from "node:assert/strict";
import { test } from "node:test";
import { CubicBezierValueSchema } from "./cubic-bezier.ts";

test("accepts a valid tuple", () => {
	const result = CubicBezierValueSchema.safeParse([0.4, 0, 0.2, 1]);
	assert.equal(result.success, true);
});

test("accepts P1x at 0", () => {
	const result = CubicBezierValueSchema.safeParse([0, 0, 0.2, 1]);
	assert.equal(result.success, true);
});

test("accepts P1x at 1", () => {
	const result = CubicBezierValueSchema.safeParse([1, 0, 0.2, 1]);
	assert.equal(result.success, true);
});

test("rejects P1x below 0", () => {
	const result = CubicBezierValueSchema.safeParse([-0.0001, 0, 0.2, 1]);
	assert.equal(result.success, false);
});

test("rejects P1x above 1", () => {
	const result = CubicBezierValueSchema.safeParse([1.0001, 0, 0.2, 1]);
	assert.equal(result.success, false);
});

test("accepts P2x at 0", () => {
	const result = CubicBezierValueSchema.safeParse([0.4, 0, 0, 1]);
	assert.equal(result.success, true);
});

test("accepts P2x at 1", () => {
	const result = CubicBezierValueSchema.safeParse([0.4, 0, 1, 1]);
	assert.equal(result.success, true);
});

test("rejects P2x below 0", () => {
	const result = CubicBezierValueSchema.safeParse([0.4, 0, -0.0001, 1]);
	assert.equal(result.success, false);
});

test("rejects P2x above 1", () => {
	const result = CubicBezierValueSchema.safeParse([0.4, 0, 1.0001, 1]);
	assert.equal(result.success, false);
});

test("accepts a negative P1y", () => {
	const result = CubicBezierValueSchema.safeParse([0.68, -0.55, 0.27, 1]);
	assert.equal(result.success, true);
});

test("accepts a P2y greater than 1", () => {
	const result = CubicBezierValueSchema.safeParse([0.68, -0.55, 0.27, 1.55]);
	assert.equal(result.success, true);
});

test("rejects a 3-element array", () => {
	const result = CubicBezierValueSchema.safeParse([0.4, 0, 0.2]);
	assert.equal(result.success, false);
});

test("rejects a 5-element array", () => {
	const result = CubicBezierValueSchema.safeParse([0.4, 0, 0.2, 1, 0]);
	assert.equal(result.success, false);
});

test("rejects a non-numeric entry", () => {
	const result = CubicBezierValueSchema.safeParse(["0.4", 0, 0.2, 1]);
	assert.equal(result.success, false);
});
