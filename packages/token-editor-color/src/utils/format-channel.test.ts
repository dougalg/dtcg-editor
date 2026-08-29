import assert from "node:assert/strict";
import { test } from "node:test";
import { formatChannel } from "./format-channel.ts";

// contract T13
test("formatChannel: no rounding, trims trailing zeros and bare dot, -0 -> 0", () => {
	assert.equal(formatChannel(0.5), "0.5");
	assert.equal(formatChannel(0.5000000001), "0.5000000001");
	assert.equal(formatChannel(145), "145");
	assert.equal(formatChannel(-0), "0");
	assert.equal(formatChannel(0), "0");
	assert.equal(formatChannel(0.123456), "0.123456");
	assert.equal(formatChannel(0.0000001), "0.0000001");
	assert.equal(formatChannel(-0.25), "-0.25");
});
