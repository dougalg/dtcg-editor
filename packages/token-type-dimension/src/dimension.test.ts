import { test } from "node:test";
import assert from "node:assert/strict";
import { DimensionValueSchema } from "./dimension.ts";

test("accepts a valid px value", () => {
  const result = DimensionValueSchema.safeParse({ value: 16, unit: "px" });
  assert.equal(result.success, true);
});

test("accepts a valid rem value of zero", () => {
  const result = DimensionValueSchema.safeParse({ value: 0, unit: "rem" });
  assert.equal(result.success, true);
});

test("rejects an unsupported unit", () => {
  const result = DimensionValueSchema.safeParse({ value: 16, unit: "vh" });
  assert.equal(result.success, false);
});

test("rejects a missing unit", () => {
  const result = DimensionValueSchema.safeParse({ value: 16 });
  assert.equal(result.success, false);
});

test("rejects a non-numeric value", () => {
  const result = DimensionValueSchema.safeParse({ value: "16", unit: "px" });
  assert.equal(result.success, false);
});
