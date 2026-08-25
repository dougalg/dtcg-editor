import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { classifyAgainstSchemas, classifyValue } from "./classify-value.ts";

test("classifyValue matches an unambiguous color object", () => {
	assert.equal(
		classifyValue({ colorSpace: "srgb", components: [0, 0, 0] }),
		"color",
	);
});

test("classifyValue matches a legacy hex color string", () => {
	assert.equal(classifyValue("#ff00ff"), "color");
});

test("classifyValue matches an unambiguous dimension object", () => {
	assert.equal(classifyValue({ value: 4, unit: "px" }), "dimension");
});

test("classifyValue returns undefined for a value matching no known type", () => {
	assert.equal(classifyValue({ nonsense: true }), undefined);
	assert.equal(classifyValue(42), undefined);
	assert.equal(classifyValue(null), undefined);
});

test("classifyAgainstSchemas returns undefined when a value matches more than one schema", () => {
	// A synthetic overlap: no two of token-core's real value schemas
	// currently match the same shape (color/dimension checked in research.md
	// Task 1), so this exercises the ambiguity branch directly against the
	// shared algorithm rather than skipping it.
	const overlappingSchemas = [
		["number", z.object({ value: z.number() })],
		["fontWeight", z.object({ value: z.number() })],
	] as const;
	assert.equal(
		classifyAgainstSchemas({ value: 4 }, overlappingSchemas),
		undefined,
	);
});

test("classifyAgainstSchemas returns the single match when only one schema matches", () => {
	const schemas = [
		["number", z.object({ value: z.number() })],
		["dimension", z.object({ value: z.number(), unit: z.string() })],
	] as const;
	assert.equal(classifyAgainstSchemas({ value: 4 }, schemas), "number");
});
