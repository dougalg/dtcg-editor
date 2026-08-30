import assert from "node:assert/strict";
import { parseTokenFile } from "@dtcg-editor/token-core";
import { test } from "vitest";
import { buildReferenceIndex } from "../lib/tokens/reference-index.ts";
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

test("generateLargeFixture output loads through the token pipeline with no parse error", () => {
	const parsed = parseTokenFile(
		JSON.stringify(generateLargeFixture({ seed: SEED })),
	);
	assert.ok(parsed.isOk(), parsed.isErr() ? parsed.error.message : "");

	const index = buildReferenceIndex([
		{ relativePath: "large_scale.tokens.json", document: parsed.value },
	]);

	// A structural regression in the generator (collapsed nesting, a `$value`
	// where a group should be, a group emitted as an array) shows up here as
	// either a parse error above or an index size far outside the ~2,000 band.
	assert.ok(
		index.definitions.size >= 1_900 && index.definitions.size <= 2_200,
		`indexed ${index.definitions.size} definitions, expected ~2,000`,
	);
});
