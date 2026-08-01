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

test("an unrecognized colorSpace produces a field-specific issue naming colorSpace", () => {
	const result = describeColorForDisplay({
		colorSpace: "not-a-space",
		components: [1, 2, 3],
	});
	assert.equal(result.cssColor, undefined);
	assert.equal(result.issues.length, 1);
	assert.ok(result.issues[0]?.startsWith("colorSpace:"));
});

test("a wrong-length components array produces a field-specific issue naming components", () => {
	const result = describeColorForDisplay({
		colorSpace: "srgb",
		components: [1, 2],
	});
	assert.equal(result.cssColor, undefined);
	assert.equal(result.issues.length, 1);
	assert.ok(result.issues[0]?.startsWith("components:"));
});

test("legacy bare-hex value produces a cssColor and no issues", () => {
	const result = describeColorForDisplay("#ff0000");
	assert.equal(result.cssColor, "#ff0000");
	assert.deepEqual(result.issues, []);
});

test("a malformed hex string produces a diagnostic issue, not the generic Zod message", () => {
	const result = describeColorForDisplay("not-a-hex-value");
	assert.equal(result.cssColor, undefined);
	assert.deepEqual(result.issues, [
		'must be a 6-digit hex string like "#rrggbb"',
	]);
});
