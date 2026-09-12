import assert from "node:assert/strict";
import { test } from "node:test";
import { FontWeightValueSchema } from "./font-weight.ts";

test("accepts the integer lower boundary, 1", () => {
	const result = FontWeightValueSchema.safeParse(1);
	assert.equal(result.success, true);
});
