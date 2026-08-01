import { test } from "vitest";
import assert from "node:assert/strict";
import { describeColorForDisplay } from "./color-display.ts";

test("valid in-range object value produces a cssColor and no issues", () => {
	const result = describeColorForDisplay({
		colorSpace: "hsl",
		components: [210, 50, 40],
	});
	assert.equal(result.cssColor, "hsl(210 50% 40%)");
	assert.deepEqual(result.issues, []);
});

test("valid-but-out-of-range object value produces a cssColor and issues", () => {
	const result = describeColorForDisplay({
		colorSpace: "hsl",
		components: [400, 50, 40],
	});
	assert.equal(result.cssColor, "hsl(400 50% 40%)");
	assert.equal(result.issues.length, 1);
});

test("structurally invalid value produces no cssColor and issues from the schema parse", () => {
	const result = describeColorForDisplay({
		colorSpace: "not-a-space",
		components: [1, 2],
	});
	assert.equal(result.cssColor, undefined);
	assert.ok(result.issues.length > 0);
});

test("legacy bare-hex value produces a cssColor and no issues", () => {
	const result = describeColorForDisplay("#ff0000");
	assert.equal(result.cssColor, "#ff0000");
	assert.deepEqual(result.issues, []);
});
