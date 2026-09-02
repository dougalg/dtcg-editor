import assert from "node:assert/strict";
import { parseTokenFile } from "@dtcg-editor/token-core";
import { test } from "vitest";
import { isCircularIfSelected } from "./candidate-selectability.ts";
import type { LoadedTokenFile } from "./load-directory.ts";
import { buildReferenceCatalogue } from "./reference-catalogue.ts";
import type { ReferenceCandidate } from "./reference-catalogue-wire.ts";
import { buildReferenceIndex } from "./reference-index.ts";
import type { ResolverModes } from "./resolver-file.ts";

function file(relativePath: string, json: unknown): LoadedTokenFile {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) {
		throw new Error(`fixture failed to parse: ${result.error.message}`);
	}
	return { relativePath, document: result.value };
}

function catalogueFrom(
	files: readonly LoadedTokenFile[],
	resolver?: ResolverModes,
): ReferenceCandidate[] {
	return buildReferenceCatalogue(
		buildReferenceIndex(files, resolver),
	).candidates.slice();
}

function candidate(
	cs: readonly ReferenceCandidate[],
	displayPath: string,
): ReferenceCandidate {
	const found = cs.find((c) => c.displayPath === displayPath);
	if (found === undefined) {
		throw new Error(`no candidate ${displayPath}`);
	}
	return found;
}

test("returns true when the candidate is the edited token's own path (one-hop self-cycle)", () => {
	// `accent` is a reference token being repointed — its current chain runs
	// through `blue`, not itself, so only the own-path check can flag it.
	const cs = catalogueFrom([
		file("base.json", {
			color: {
				$type: "color",
				blue: { $value: { hex: "#00f" } },
				accent: { $value: "{color.blue}" },
			},
		}),
	]);

	assert.equal(
		isCircularIfSelected(["color", "accent"], candidate(cs, "color.accent")),
		true,
	);
});

test("returns true when the edited path is a step in the candidate's 2-hop chain", () => {
	const cs = catalogueFrom([
		file("base.json", {
			c: { $type: "color", $value: "{m}" },
			m: { $type: "color", $value: "{edited}" },
			edited: { $type: "color", $value: { hex: "#f00" } },
		}),
	]);

	assert.equal(isCircularIfSelected(["edited"], candidate(cs, "c")), true);
});

test("returns true when the edited path is a step only in the candidate's 3-hop chain", () => {
	const cs = catalogueFrom([
		file("base.json", {
			c: { $type: "color", $value: "{m}" },
			m: { $type: "color", $value: "{n}" },
			n: { $type: "color", $value: "{edited}" },
			edited: { $type: "color", $value: { hex: "#f00" } },
		}),
	]);

	assert.equal(isCircularIfSelected(["edited"], candidate(cs, "c")), true);
});

test("returns true when the candidate is circular through the edited path under one mode only", () => {
	const resolver: ResolverModes = {
		modes: ["light", "dark"],
		filesByMode: new Map([
			["light", ["base.json", "light.json"]],
			["dark", ["base.json", "dark.json"]],
		]),
	};
	const cs = catalogueFrom(
		[
			file("base.json", {
				edited: { $type: "color", $value: { hex: "#000" } },
			}),
			file("light.json", { c: { $type: "color", $value: "{edited}" } }),
			file("dark.json", { c: { $type: "color", $value: { hex: "#fff" } } }),
		],
		resolver,
	);

	assert.equal(isCircularIfSelected(["edited"], candidate(cs, "c")), true);
});

test("returns false for a candidate in a pre-existing cycle that does not involve the edited path", () => {
	const cs = catalogueFrom([
		file("base.json", {
			p: { $type: "color", $value: "{q}" },
			q: { $type: "color", $value: "{p}" },
			edited: { $type: "color", $value: { hex: "#f00" } },
		}),
	]);

	assert.equal(isCircularIfSelected(["edited"], candidate(cs, "p")), false);
});

test("returns false for a candidate resolving to a missing path", () => {
	const cs = catalogueFrom([
		file("base.json", {
			c: { $type: "color", $value: "{ghost}" },
			edited: { $type: "color", $value: { hex: "#f00" } },
		}),
	]);

	assert.equal(isCircularIfSelected(["edited"], candidate(cs, "c")), false);
});

test("returns false for a candidate resolving to a group", () => {
	const cs = catalogueFrom([
		file("base.json", {
			grp: { $type: "color", inner: { $value: { hex: "#0f0" } } },
			c: { $type: "color", $value: "{grp}" },
			edited: { $type: "color", $value: { hex: "#f00" } },
		}),
	]);

	assert.equal(isCircularIfSelected(["edited"], candidate(cs, "c")), false);
});

test("returns false for a candidate that resolves cleanly and not through the edited path", () => {
	const cs = catalogueFrom([
		file("base.json", {
			other: { $type: "color", $value: { hex: "#0f0" } },
			c: { $type: "color", $value: "{other}" },
			edited: { $type: "color", $value: { hex: "#f00" } },
		}),
	]);

	assert.equal(isCircularIfSelected(["edited"], candidate(cs, "c")), false);
});
