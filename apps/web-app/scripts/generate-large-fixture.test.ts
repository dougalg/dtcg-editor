import assert from "node:assert/strict";
import { test } from "vitest";
import { generateLargeFixture } from "./generate-large-fixture.ts";

// A fixed, arbitrary seed — the point of the behaviour is that the same seed
// always yields the same bytes, so the committed fixture is reproducible.
const SEED = 20_260_830;

interface JsonObject {
	[key: string]: unknown;
}

function isDtcgToken(node: unknown): node is JsonObject {
	return typeof node === "object" && node !== null && "$value" in node;
}

/** Walk a DTCG document tree, collecting every token and its group depth. */
function walkTokens(
	node: unknown,
	depth = 0,
	acc: { tokens: { path: string[]; node: JsonObject }[]; maxDepth: number } = {
		tokens: [],
		maxDepth: 0,
	},
	path: string[] = [],
): { tokens: { path: string[]; node: JsonObject }[]; maxDepth: number } {
	if (typeof node !== "object" || node === null) return acc;
	if (isDtcgToken(node)) {
		acc.tokens.push({ path, node });
		return acc;
	}
	for (const [key, child] of Object.entries(node as JsonObject)) {
		if (key.startsWith("$")) continue;
		acc.maxDepth = Math.max(acc.maxDepth, depth + 1);
		walkTokens(child, depth + 1, acc, [...path, key]);
	}
	return acc;
}

test("generateLargeFixture emits byte-identical output for a fixed seed", () => {
	const first = JSON.stringify(generateLargeFixture({ seed: SEED }));
	const second = JSON.stringify(generateLargeFixture({ seed: SEED }));

	assert.equal(first, second);
});

test("generateLargeFixture emits ~2,000 tokens nested at least 3 levels deep", () => {
	const { tokens, maxDepth } = walkTokens(generateLargeFixture({ seed: SEED }));

	assert.ok(
		tokens.length >= 1_900 && tokens.length <= 2_200,
		`token count ${tokens.length} is outside 1900-2200`,
	);
	assert.ok(maxDepth >= 3, `max group depth ${maxDepth} is < 3`);
});
