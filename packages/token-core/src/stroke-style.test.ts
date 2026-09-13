import assert from "node:assert/strict";
import { test } from "node:test";
import { StrokeStyleValueSchema } from "./stroke-style.ts";

const KEYWORDS = [
	"solid",
	"dashed",
	"dotted",
	"double",
	"groove",
	"ridge",
	"outset",
	"inset",
] as const;

for (const keyword of KEYWORDS) {
	test(`accepts the keyword string "${keyword}"`, () => {
		const result = StrokeStyleValueSchema.safeParse(keyword);
		assert.equal(result.success, true);
	});
}

test("rejects an unrecognized keyword string", () => {
	const result = StrokeStyleValueSchema.safeParse("wavy");
	assert.equal(result.success, false);
});

test("accepts a well-formed dashArray/lineCap object", () => {
	const result = StrokeStyleValueSchema.safeParse({
		dashArray: [
			{ value: 4, unit: "px" },
			{ value: 2, unit: "px" },
		],
		lineCap: "round",
	});
	assert.equal(result.success, true);
});

test("accepts an empty dashArray", () => {
	const result = StrokeStyleValueSchema.safeParse({
		dashArray: [],
		lineCap: "butt",
	});
	assert.equal(result.success, true);
});

test("rejects an object with a malformed dashArray entry (missing unit)", () => {
	const result = StrokeStyleValueSchema.safeParse({
		dashArray: [{ value: 4 }],
		lineCap: "round",
	});
	assert.equal(result.success, false);
});

test("rejects an object with an invalid dashArray entry unit", () => {
	const result = StrokeStyleValueSchema.safeParse({
		dashArray: [{ value: 4, unit: "vh" }],
		lineCap: "round",
	});
	assert.equal(result.success, false);
});

test("rejects an object with an invalid lineCap", () => {
	const result = StrokeStyleValueSchema.safeParse({
		dashArray: [{ value: 4, unit: "px" }],
		lineCap: "triangle",
	});
	assert.equal(result.success, false);
});

test("rejects an object missing lineCap", () => {
	const result = StrokeStyleValueSchema.safeParse({
		dashArray: [{ value: 4, unit: "px" }],
	});
	assert.equal(result.success, false);
});

test("rejects a non-string/non-object shape (a number)", () => {
	const result = StrokeStyleValueSchema.safeParse(42);
	assert.equal(result.success, false);
});
