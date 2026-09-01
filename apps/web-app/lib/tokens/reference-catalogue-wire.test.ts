import assert from "node:assert/strict";
import { test } from "vitest";
import { ReferenceCatalogueSchema } from "./reference-catalogue-wire.ts";

const WELL_FORMED = {
	modes: ["light", "dark"],
	candidates: [
		{
			path: ["color", "brand", "blue"],
			displayPath: "color.brand.blue",
			effectiveType: "color",
			definitions: [
				{ mode: undefined, file: "base.json", rawValue: "#0044ff" },
			],
			preview: [
				{
					mode: undefined,
					outcome: {
						steps: [
							{
								path: ["color", "brand", "blue"],
								file: "base.json",
								mode: undefined,
							},
						],
						outcome: { kind: "resolved", value: "#0044ff", type: "color" },
					},
				},
			],
		},
	],
};

function withFirstPreviewOutcome(outcome: unknown): unknown {
	return {
		...WELL_FORMED,
		candidates: [
			{
				...WELL_FORMED.candidates[0],
				preview: [{ mode: undefined, outcome }],
			},
		],
	};
}

test("a well-formed catalogue payload parses to the typed ReferenceCatalogue", () => {
	const parsed = ReferenceCatalogueSchema.parse(WELL_FORMED);
	assert.equal(parsed.modes.length, 2);
	assert.equal(parsed.candidates[0]?.displayPath, "color.brand.blue");
	assert.equal(
		parsed.candidates[0]?.preview[0]?.outcome.outcome.kind,
		"resolved",
	);
});

test("a preview outcome missing steps is rejected", () => {
	const result = ReferenceCatalogueSchema.safeParse(
		withFirstPreviewOutcome({
			outcome: { kind: "resolved", value: "#0044ff", type: "color" },
		}),
	);
	assert.equal(result.success, false);
});

test("an unknown outcome.kind is rejected by the discriminated union", () => {
	const result = ReferenceCatalogueSchema.safeParse(
		withFirstPreviewOutcome({
			steps: [],
			outcome: { kind: "who-knows", value: "x" },
		}),
	);
	assert.equal(result.success, false);
});
