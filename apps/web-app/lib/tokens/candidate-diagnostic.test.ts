import assert from "node:assert/strict";
import { parseTokenFile } from "@dtcg-editor/token-core";
import { test } from "vitest";
import { diagnosticFor } from "./candidate-diagnostic.ts";
import type { LoadedTokenFile } from "./load-directory.ts";
import { buildReferenceCatalogue } from "./reference-catalogue.ts";
import type { ReferenceCandidate } from "./reference-catalogue-wire.ts";
import { buildReferenceIndex } from "./reference-index.ts";

function file(relativePath: string, json: unknown): LoadedTokenFile {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) {
		throw new Error(`fixture failed to parse: ${result.error.message}`);
	}
	return { relativePath, document: result.value };
}

function catalogueFrom(
	files: readonly LoadedTokenFile[],
): ReferenceCandidate[] {
	return buildReferenceCatalogue(buildReferenceIndex(files)).candidates.slice();
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

test("the edited token's own path is diagnosed circular", () => {
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
		diagnosticFor(["color", "accent"], candidate(cs, "color.accent")),
		"circular",
	);
});

test("circular takes precedence over missing when a candidate is both", () => {
	// accent's own value references a path that doesn't exist, so accent's
	// own preview outcome is "unresolved" — but accent is also the edited
	// token's own path (self, circular). Circular must win: it's the one
	// diagnostic that makes a candidate unselectable (FR-024), so it can't
	// be shadowed by a merely-informational missing/group flag.
	const cs = catalogueFrom([
		file("base.json", {
			color: {
				$type: "color",
				accent: { $value: "{color.nope}" },
			},
		}),
	]);

	assert.equal(
		diagnosticFor(["color", "accent"], candidate(cs, "color.accent")),
		"circular",
	);
});

test("a candidate resolving to a missing path is diagnosed missing", () => {
	const cs = catalogueFrom([
		file("base.json", {
			color: {
				$type: "color",
				accent: { $value: "{color.blue}" },
				broken: { $value: "{color.nope}" },
			},
		}),
	]);

	assert.equal(
		diagnosticFor(["color", "accent"], candidate(cs, "color.broken")),
		"missing",
	);
});

test("a candidate resolving to a group is diagnosed group", () => {
	const cs = catalogueFrom([
		file("base.json", {
			color: {
				$type: "color",
				accent: { $value: "{color.blue}" },
				group: { child: { $value: { hex: "#000" } } },
				toGroup: { $value: "{color.group}" },
			},
		}),
	]);

	assert.equal(
		diagnosticFor(["color", "accent"], candidate(cs, "color.toGroup")),
		"group",
	);
});

test("a cleanly-resolving candidate is diagnosed none", () => {
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
		diagnosticFor(["color", "accent"], candidate(cs, "color.blue")),
		"none",
	);
});
