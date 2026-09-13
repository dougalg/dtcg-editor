import assert from "node:assert/strict";
import { test } from "node:test";
import { TransitionValueSchema } from "./transition.ts";

const VALID_VALUE = {
	duration: { value: 200, unit: "ms" },
	delay: { value: 0, unit: "ms" },
	timingFunction: [0.4, 0, 0.2, 1],
};

test("accepts a valid transition value", () => {
	const result = TransitionValueSchema.safeParse(VALID_VALUE);
	assert.equal(result.success, true);
});

test("rejects a value missing duration", () => {
	const { duration: _duration, ...rest } = VALID_VALUE;
	const result = TransitionValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a value missing delay", () => {
	const { delay: _delay, ...rest } = VALID_VALUE;
	const result = TransitionValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects a value missing timingFunction", () => {
	const { timingFunction: _timingFunction, ...rest } = VALID_VALUE;
	const result = TransitionValueSchema.safeParse(rest);
	assert.equal(result.success, false);
});

test("rejects an invalid nested duration", () => {
	const result = TransitionValueSchema.safeParse({
		...VALID_VALUE,
		duration: { value: -1, unit: "ms" },
	});
	assert.equal(result.success, false);
});
