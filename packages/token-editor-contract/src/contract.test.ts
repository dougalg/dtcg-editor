import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { z } from "zod";
import type { TokenTypeContract } from "./contract.ts";
import { TokenTypeValidationError, validateTokenValue } from "./contract.ts";

const numberContract: TokenTypeContract<number> = {
	type: "test-number",
	valueSchema: z.number(),
	serializeValue: (value) => value,
	Editor: () => createElement("input"),
};

const numberContractWithEditorOptionsSchema: TokenTypeContract<number> = {
	...numberContract,
	editorOptionsSchema: z.object({ label: z.string() }),
};

const numberContractWithValidationErrorHandler: TokenTypeContract<number> = {
	...numberContract,
	ValidationErrorHandler: ({ error }) =>
		createElement("span", null, error.message),
};

test("a contract constructs without editorOptionsSchema", () => {
	assert.equal(numberContract.editorOptionsSchema, undefined);
});

test("a contract constructs with editorOptionsSchema present", () => {
	assert.equal(
		numberContractWithEditorOptionsSchema.editorOptionsSchema?.safeParse({
			label: "ok",
		}).success,
		true,
	);
});

test("a contract constructs without ValidationErrorHandler", () => {
	assert.equal(numberContract.ValidationErrorHandler, undefined);
});

test("a contract's ValidationErrorHandler receives a plain value and a concrete TokenTypeValidationError, not a Result", () => {
	const result = validateTokenValue(numberContract, "not a number");
	assert.ok(result.isErr());
	const element =
		numberContractWithValidationErrorHandler.ValidationErrorHandler?.({
			value: "not a number",
			error: result.error,
		});
	assert.ok(element !== null && element !== undefined);
});

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

test("the returned error's issues has one { path, message, code } entry per Zod issue, with message unchanged from the joined format", () => {
	const result = validateTokenValue(numberContract, "not a number");
	assert.ok(result.isErr());
	assert.equal(result.error.issues.length, 1);
	const [issue] = result.error.issues;
	assert.deepEqual(issue?.path, []);
	assert.equal(typeof issue?.message, "string");
	assert.equal(typeof issue?.code, "string");
	assert.equal(
		result.error.message,
		`Invalid test-number value: ${issue?.message}`,
	);
});
