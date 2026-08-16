import assert from "node:assert/strict";
import { test } from "node:test";
import { checkColorValueIssues } from "./range-validation.ts";

test("checkColorValueIssues returns [] for in-range values across space families", () => {
	assert.deepEqual(
		checkColorValueIssues({ colorSpace: "srgb", components: [0.5, 0.2, 0.8] }),
		[],
	);
	assert.deepEqual(
		checkColorValueIssues({ colorSpace: "hsl", components: [210, 50, 40] }),
		[],
	);
	assert.deepEqual(
		checkColorValueIssues({ colorSpace: "lab", components: [50, 40, -30] }),
		[],
	);
});

test("checkColorValueIssues flags an out-of-range hsl hue", () => {
	const issues = checkColorValueIssues({
		colorSpace: "hsl",
		components: [400, 50, 40],
	});
	assert.equal(issues.length, 1);
});

test("checkColorValueIssues flags an out-of-range srgb component", () => {
	const issues = checkColorValueIssues({
		colorSpace: "srgb",
		components: [1.5, 0.2, 0.8],
	});
	assert.equal(issues.length, 1);
});

test("checkColorValueIssues ignores a 'none' component that would otherwise be out of range", () => {
	const issues = checkColorValueIssues({
		colorSpace: "hsl",
		components: ["none", 50, 40],
	});
	assert.deepEqual(issues, []);
});

test("checkColorValueIssues returns [] for a legacy hex string", () => {
	assert.deepEqual(checkColorValueIssues("#ff00ff"), []);
});
