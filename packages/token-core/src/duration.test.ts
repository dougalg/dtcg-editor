import assert from "node:assert/strict";
import { test } from "node:test";
import { DurationValueSchema } from "./duration.ts";

test("accepts a valid ms value", () => {
	const result = DurationValueSchema.safeParse({ value: 200, unit: "ms" });
	assert.equal(result.success, true);
});

test("accepts a valid zero s value", () => {
	const result = DurationValueSchema.safeParse({ value: 0, unit: "s" });
	assert.equal(result.success, true);
});

test("rejects a negative value", () => {
	const result = DurationValueSchema.safeParse({ value: -1, unit: "ms" });
	assert.equal(result.success, false);
});

test("rejects an unsupported unit", () => {
	const result = DurationValueSchema.safeParse({ value: 200, unit: "vh" });
	assert.equal(result.success, false);
});

test("rejects a missing unit", () => {
	const result = DurationValueSchema.safeParse({ value: 200 });
	assert.equal(result.success, false);
});

test("rejects a non-numeric value", () => {
	const result = DurationValueSchema.safeParse({ value: "200", unit: "ms" });
	assert.equal(result.success, false);
});
