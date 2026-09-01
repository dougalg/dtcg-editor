import assert from "node:assert/strict";
import { parseTokenFile } from "@dtcg-editor/token-core";
import { test } from "vitest";
import type { LoadedTokenFile } from "./load-directory.ts";
import { buildReferenceCatalogue } from "./reference-catalogue.ts";
import { buildReferenceIndex } from "./reference-index.ts";
import type { ResolverModes } from "./resolver-file.ts";

const LIGHT_DARK: ResolverModes = {
	modes: ["light", "dark"],
	filesByMode: new Map([
		["light", ["colors.json", "semantic.json"]],
		["dark", ["colors.json", "semantic.json", "dark.json"]],
	]),
};

function file(relativePath: string, json: unknown): LoadedTokenFile {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) {
		throw new Error(`test fixture failed to parse: ${result.error.message}`);
	}
	return { relativePath, document: result.value };
}

test("every token path in the index appears exactly once as a candidate", () => {
	const index = buildReferenceIndex([
		file("base.json", {
			color: {
				$type: "color",
				blue: { $value: { colorSpace: "srgb", components: [0, 0, 1] } },
				red: { $value: { colorSpace: "srgb", components: [1, 0, 0] } },
			},
		}),
		file("semantic.json", {
			text: { $type: "color", $value: "{color.blue}" },
		}),
	]);

	const catalogue = buildReferenceCatalogue(index);
	const paths = catalogue.candidates.map((c) => c.displayPath).sort();

	assert.deepEqual(paths, ["color.blue", "color.red", "text"]);
});

test("no group path appears as a candidate", () => {
	const index = buildReferenceIndex([
		file("base.json", {
			color: {
				$type: "color",
				brand: {
					blue: { $value: { colorSpace: "srgb", components: [0, 0, 1] } },
				},
			},
		}),
	]);

	const catalogue = buildReferenceCatalogue(index);
	const paths = catalogue.candidates.map((c) => c.displayPath);

	assert.deepEqual(paths, ["color.brand.blue"]);
	assert.equal(paths.includes("color"), false);
	assert.equal(paths.includes("color.brand"), false);
});

test("a path defined once yields a single definition with mode undefined", () => {
	const index = buildReferenceIndex([
		file("base.json", {
			space: { $type: "dimension", sm: { $value: { value: 4, unit: "px" } } },
		}),
	]);

	const candidate = buildReferenceCatalogue(index).candidates.find(
		(c) => c.displayPath === "space.sm",
	);

	assert.equal(candidate?.definitions.length, 1);
	assert.equal(candidate?.definitions[0]?.mode, undefined);
	assert.equal(candidate?.definitions[0]?.file, "base.json");
});

test("a multiply-defined path yields one candidate with one definition per mode", () => {
	const index = buildReferenceIndex(
		[
			file("colors.json", {
				color: { blue: { $type: "color", $value: { hex: "#0000ff" } } },
			}),
			file("semantic.json", {
				text: { $type: "color", $value: "{color.blue}" },
			}),
			file("dark.json", {
				text: { $type: "color", $value: { hex: "#ffffff" } },
			}),
		],
		LIGHT_DARK,
	);

	const textCandidates = buildReferenceCatalogue(index).candidates.filter(
		(c) => c.displayPath === "text",
	);

	assert.equal(textCandidates.length, 1);
	assert.deepEqual(textCandidates[0]?.definitions.map((d) => d.mode).sort(), [
		"dark",
		"light",
	]);
});

test("a candidate whose value is a reference previews the end-of-chain value", () => {
	const index = buildReferenceIndex([
		file("base.json", {
			color: {
				$type: "color",
				blue: { $value: { hex: "#0000ff" } },
				brand: { $value: "{color.blue}" },
			},
		}),
		file("semantic.json", {
			link: { $type: "color", $value: "{color.brand}" },
		}),
	]);

	const link = buildReferenceCatalogue(index).candidates.find(
		(c) => c.displayPath === "link",
	);
	const outcome = link?.preview[0]?.outcome.outcome;

	assert.equal(outcome?.kind, "resolved");
	if (outcome?.kind === "resolved") {
		assert.deepEqual(outcome.value, { hex: "#0000ff" });
	}
});

test("a candidate resolving to a missing path previews unresolved", () => {
	const index = buildReferenceIndex([
		file("base.json", { text: { $type: "color", $value: "{color.ghost}" } }),
	]);
	const outcome = buildReferenceCatalogue(index).candidates.find(
		(c) => c.displayPath === "text",
	)?.preview[0]?.outcome.outcome;

	assert.equal(outcome?.kind, "unresolved");
});

test("a candidate resolving to a group previews group-target", () => {
	const index = buildReferenceIndex([
		file("base.json", {
			color: {
				$type: "color",
				brand: { blue: { $value: { hex: "#0000ff" } } },
			},
			text: { $type: "color", $value: "{color.brand}" },
		}),
	]);
	const outcome = buildReferenceCatalogue(index).candidates.find(
		(c) => c.displayPath === "text",
	)?.preview[0]?.outcome.outcome;

	assert.equal(outcome?.kind, "group-target");
});

test("a candidate that is itself inside a cycle previews circular", () => {
	const index = buildReferenceIndex([
		file("base.json", {
			a: { $type: "color", $value: "{b}" },
			b: { $type: "color", $value: "{a}" },
		}),
	]);
	const outcome = buildReferenceCatalogue(index).candidates.find(
		(c) => c.displayPath === "a",
	)?.preview[0]?.outcome.outcome;

	assert.equal(outcome?.kind, "circular");
});

test("preview steps are populated for a multi-hop chain", () => {
	const index = buildReferenceIndex([
		file("base.json", {
			color: {
				$type: "color",
				blue: { $value: { hex: "#0000ff" } },
				brand: { $value: "{color.blue}" },
			},
			link: { $type: "color", $value: "{color.brand}" },
		}),
	]);
	const steps = buildReferenceCatalogue(index).candidates.find(
		(c) => c.displayPath === "link",
	)?.preview[0]?.outcome.steps;

	assert.deepEqual(
		steps?.map((s) => s.path.join(".")),
		["color.brand", "color.blue"],
	);
});

test("modes mirrors the resolver; empty when there is no resolver", () => {
	const noResolver = buildReferenceCatalogue(
		buildReferenceIndex([
			file("base.json", {
				space: { $type: "dimension", sm: { $value: { value: 4, unit: "px" } } },
			}),
		]),
	);
	assert.deepEqual(noResolver.modes, []);

	const withResolver = buildReferenceCatalogue(
		buildReferenceIndex(
			[
				file("colors.json", {
					color: { blue: { $type: "color", $value: { hex: "#0000ff" } } },
				}),
				file("semantic.json", {
					text: { $type: "color", $value: "{color.blue}" },
				}),
				file("dark.json", {
					text: { $type: "color", $value: { hex: "#fff" } },
				}),
			],
			LIGHT_DARK,
		),
	);
	assert.deepEqual(withResolver.modes, ["light", "dark"]);
});
