import assert from "node:assert/strict";
import { test } from "vitest";
import {
	type EditedTokenContext,
	filterCandidates,
} from "./candidate-filter.ts";
import type { ReferenceCandidate } from "./reference-catalogue-wire.ts";

function candidate(
	displayPath: string,
	opts: { effectiveType?: string; file?: string } = {},
): ReferenceCandidate {
	const path = displayPath.split(".");
	const file = opts.file ?? "base.json";
	return {
		path,
		displayPath,
		effectiveType: opts.effectiveType,
		definitions: [{ mode: undefined, file, rawValue: "x" }],
		preview: [
			{
				mode: undefined,
				outcome: {
					steps: [{ path, file, mode: undefined }],
					outcome: { kind: "resolved", value: "x", type: opts.effectiveType },
				},
			},
		],
	};
}

const EDITED: EditedTokenContext = {
	path: ["color", "accent"],
	effectiveType: "color",
	file: "semantic.json",
};

function paths(cs: readonly ReferenceCandidate[]): string[] {
	return cs.map((c) => c.displayPath);
}

test("a non-empty query keeps only case-insensitive substring matches on the full path", () => {
	const all = [
		candidate("color.brand.blue"),
		candidate("color.brand.red"),
		candidate("space.small"),
	];

	assert.deepEqual(paths(filterCandidates(all, "BRAND", EDITED)), [
		"color.brand.blue",
		"color.brand.red",
	]);
});

test("the match is against the whole dotted path, not only the leaf segment", () => {
	const all = [candidate("color.brand.blue"), candidate("space.blue")];

	assert.deepEqual(paths(filterCandidates(all, "brand.blue", EDITED)), [
		"color.brand.blue",
	]);
});

test("results are ordered by where the match starts, earliest first", () => {
	const all = [
		candidate("a.b.color"),
		candidate("color.one"),
		candidate("x.color.two"),
	];

	assert.deepEqual(paths(filterCandidates(all, "color", EDITED)), [
		"color.one",
		"x.color.two",
		"a.b.color",
	]);
});

test("candidates with an equal match position are ordered alphabetically", () => {
	// leaf-only paths -> the match for "size" starts at the same index (2) in
	// every one, so only the alphabetical tie-break distinguishes them.
	const all = [candidate("z.size"), candidate("a.size"), candidate("m.size")];

	assert.deepEqual(paths(filterCandidates(all, "size", EDITED)), [
		"a.size",
		"m.size",
		"z.size",
	]);
});

test("a query matching nothing returns an empty list", () => {
	const all = [candidate("color.brand.blue"), candidate("space.small")];

	assert.deepEqual(filterCandidates(all, "nonesuch", EDITED), []);
});

test("an empty query, and a whitespace-only query, both return every candidate", () => {
	const all = [candidate("color.blue"), candidate("space.small")];

	assert.equal(filterCandidates(all, "", EDITED).length, 2);
	assert.equal(filterCandidates(all, "   ", EDITED).length, 2);
});

test("for an empty query, same-type sorts before same-file, which sorts before the rest", () => {
	const all = [
		candidate("other.thing", { effectiveType: "dimension", file: "misc.json" }),
		candidate("in.same.file", {
			effectiveType: "dimension",
			file: "semantic.json",
		}),
		candidate("a.color", { effectiveType: "color", file: "base.json" }),
	];

	assert.deepEqual(paths(filterCandidates(all, "", EDITED)), [
		"a.color",
		"in.same.file",
		"other.thing",
	]);
});

test("for an empty query with an undefined edited type, the same-type band is skipped", () => {
	const untypedEdited: EditedTokenContext = {
		path: ["raw"],
		effectiveType: undefined,
		file: "semantic.json",
	};
	const all = [
		candidate("z.other", { effectiveType: "color", file: "misc.json" }),
		candidate("a.untyped", { file: "misc.json" }),
		candidate("a.here", { effectiveType: "color", file: "semantic.json" }),
	];

	// Edited type is undefined, so nothing is promoted for "same type" — not
	// even the candidate that is itself untyped. Only same-file (a.here) leads;
	// the two misc.json entries follow alphabetically.
	assert.deepEqual(paths(filterCandidates(all, "", untypedEdited)), [
		"a.here",
		"a.untyped",
		"z.other",
	]);
});

test("within a band, candidates are alphabetical by path", () => {
	const all = [
		candidate("z.color", { effectiveType: "color", file: "base.json" }),
		candidate("a.color", { effectiveType: "color", file: "base.json" }),
		candidate("m.color", { effectiveType: "color", file: "base.json" }),
	];

	assert.deepEqual(paths(filterCandidates(all, "", EDITED)), [
		"a.color",
		"m.color",
		"z.color",
	]);
});

test("the edited token's own path is not removed from the results", () => {
	const all = [candidate("color.accent"), candidate("color.blue")];

	assert.ok(
		paths(filterCandidates(all, "accent", EDITED)).includes("color.accent"),
	);
	assert.ok(paths(filterCandidates(all, "", EDITED)).includes("color.accent"));
});

test("a query with braces or a leading dot is matched literally as a substring", () => {
	const all = [candidate("color.brand.blue"), candidate("space.small")];

	assert.deepEqual(paths(filterCandidates(all, "{color.brand}", EDITED)), []);
	assert.deepEqual(paths(filterCandidates(all, "color.brand", EDITED)), [
		"color.brand.blue",
	]);
	assert.deepEqual(paths(filterCandidates(all, ".brand.", EDITED)), [
		"color.brand.blue",
	]);
});
