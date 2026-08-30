import assert from "node:assert/strict";
import { parseTokenFile } from "@dtcg-editor/token-core";
import { validateTokenValue } from "@dtcg-editor/token-editor-contract";
import { test } from "vitest";
import { resolveBuiltInContract } from "../lib/token-editors/built-in.ts";
import { buildReferenceIndex } from "../lib/tokens/reference-index.ts";
import { generateLargeFixture } from "./generate-large-fixture.ts";

type DispatchPath =
	| "color"
	| "dimension"
	| "reference"
	| "fallback"
	| "invalid";

/** Classify a token the way TreeTokenNode's editor dispatch would. */
function dispatchPathOf(node: JsonObject): DispatchPath {
	const value = node.$value;
	if (typeof value === "string" && /^\{.+\}$/.test(value)) return "reference";
	const type = node.$type;
	if (typeof type !== "string") return "fallback";
	const contract = resolveBuiltInContract(type);
	if (!contract) return "fallback";
	if (validateTokenValue(contract, value).isErr()) return "invalid";
	return type === "color" ? "color" : "dimension";
}

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

/** Count, per referenced path, how many token `$value`s are the reference `{path}`. */
function referrerCounts(tokens: { node: JsonObject }[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const { node } of tokens) {
		const value = node.$value;
		if (typeof value === "string" && /^\{.+\}$/.test(value)) {
			const target = value.slice(1, -1);
			counts.set(target, (counts.get(target) ?? 0) + 1);
		}
	}
	return counts;
}

test("generateLargeFixture puts one token of every editable dispatch path in the first 20", () => {
	const { tokens } = walkTokens(generateLargeFixture({ seed: SEED }));
	const firstTwenty = tokens.slice(0, 20);
	const seen = new Set(firstTwenty.map(({ node }) => dispatchPathOf(node)));

	for (const path of [
		"color",
		"dimension",
		"reference",
		"fallback",
		"invalid",
	] as const) {
		assert.ok(
			seen.has(path),
			`no "${path}" token in the first 20 (saw: ${[...seen].join(", ")})`,
		);
	}
});

test("generateLargeFixture output has a token referenced by at least 100 other tokens", () => {
	const { tokens } = walkTokens(generateLargeFixture({ seed: SEED }));
	const counts = referrerCounts(tokens);
	const mostReferenced = Math.max(0, ...counts.values());

	assert.ok(
		mostReferenced >= 100,
		`most-referenced token has ${mostReferenced} referrers, expected >= 100`,
	);
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
