import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { z } from "zod";
import { TokenTypeValidationError, validateTokenValue } from "./contract.ts";
import type { TokenTypeContract } from "./contract.ts";

const numberContract: TokenTypeContract<number> = {
  type: "test-number",
  valueSchema: z.number(),
  serializeValue: (value) => value,
  Editor: () => createElement("input"),
};

test("returns the parsed value for valid input", () => {
  const result = validateTokenValue(numberContract, 42);
  assert.ok(result.isOk());
  assert.equal(result.value, 42);
});

test("returns a TokenTypeValidationError for invalid input", () => {
  const result = validateTokenValue(numberContract, "not a number");
  assert.ok(result.isErr());
  assert.ok(result.error instanceof TokenTypeValidationError);
});
