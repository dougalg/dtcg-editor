import assert from "node:assert/strict";
import { test } from "vitest";
import { filterCandidates } from "./candidate-filter.ts";
import { isCircularIfSelected } from "./candidate-selectability.ts";
import type { ReferenceCandidate } from "./reference-catalogue-wire.ts";

// SC-004: keystroke -> updated-list latency stays under 50ms at p95 for a
// 1,000-path catalogue, and no single pass exceeds 50ms (the Long Task
// threshold) — a hard test gate, not a recorded observation. This measures
// real wall-clock time deliberately (see reference-index.test.ts's own
// SC-010 benchmark for the same rationale), so runs alone in its own
// late-group project (vitest.config.ts `BENCH_FILES`) rather than under
// contention with the rest of the suite.
//
// What's timed per "keystroke" is `filterCandidates` *plus* a full
// `isCircularIfSelected` pass over every returned candidate — that pass is
// exactly what `TokenReferencePicker`'s `renderItem` does per row via
// `diagnosticFor` (U105) on every keystroke's re-render, so timing
// `filterCandidates` alone would understate the real per-keystroke cost.

const CANDIDATE_COUNT = 1_000;

function syntheticCatalogue(count: number): ReferenceCandidate[] {
	const candidates: ReferenceCandidate[] = [];
	for (let i = 0; i < count; i++) {
		const path = ["group", `token_${i}`];
		candidates.push({
			path,
			displayPath: path.join("."),
			effectiveType: "color",
			definitions: [
				{ file: "bench.tokens.json", rawValue: { hex: "#000000" } },
			],
			preview: [
				{
					outcome: {
						steps: [],
						outcome: {
							kind: "resolved",
							value: { hex: "#000000" },
							type: "color",
						},
					},
				},
			],
		});
	}
	return candidates;
}

test("filterCandidates + a full isCircularIfSelected pass over 1,000 candidates stays under 50ms at p95", () => {
	const candidates = syntheticCatalogue(CANDIDATE_COUNT);
	const edited = {
		path: ["group", "edited"],
		effectiveType: "color",
		file: "bench.tokens.json",
	};
	// One query per simulated keystroke, narrowing progressively — the
	// realistic worst case (early, broad queries scan the most candidates).
	const KEYSTROKES = ["t", "to", "tok", "toke", "token", "token_", "token_5"];
	const RUNS = 10;

	const elapsedMs: number[] = [];
	for (let run = 0; run < RUNS; run++) {
		for (const query of KEYSTROKES) {
			const start = performance.now();
			const items = filterCandidates(candidates, query, edited);
			for (const item of items) {
				isCircularIfSelected(edited.path, item);
			}
			elapsedMs.push(performance.now() - start);
		}
	}

	elapsedMs.sort((a, b) => a - b);
	const p95Index = Math.floor(elapsedMs.length * 0.95);
	const p95 = elapsedMs[p95Index] ?? elapsedMs[elapsedMs.length - 1];
	const worst = elapsedMs[elapsedMs.length - 1];

	assert.ok(
		p95 !== undefined && p95 < 50,
		`p95 keystroke->sorted-list latency was ${p95?.toFixed(2)}ms over ${elapsedMs.length} samples, expected under 50ms (SC-004)`,
	);
	assert.ok(
		worst !== undefined && worst < 50,
		`worst single pass was ${worst?.toFixed(2)}ms, expected under 50ms — no single main-thread task may exceed the Long Task threshold (SC-004)`,
	);
});
