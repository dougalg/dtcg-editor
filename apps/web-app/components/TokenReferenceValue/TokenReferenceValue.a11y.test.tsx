import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { TokenReferenceValue } from "./TokenReferenceValue.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations for a resolved color value", async () => {
	const resolved: ResolvedReference = {
		reference: {
			targetPath: ["color", "brand", "blue"],
			at: [],
			raw: "{color.brand.blue}",
		},
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [
						{
							path: ["color", "brand", "blue"],
							file: "base.json",
							mode: undefined,
						},
					],
					outcome: {
						kind: "resolved",
						value: { colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
						type: "color",
					},
				},
				targetFile: "base.json",
			},
		],
	};
	const { container } = render(<TokenReferenceValue resolved={resolved} />);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations for an unresolved reference", async () => {
	const resolved: ResolvedReference = {
		reference: { targetPath: ["color", "nope"], at: [], raw: "{color.nope}" },
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [],
					outcome: { kind: "unresolved", missingPath: ["color", "nope"] },
				},
				targetFile: undefined,
			},
		],
	};
	const { container } = render(<TokenReferenceValue resolved={resolved} />);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations for a multiply-defined (per-mode) reference", async () => {
	const resolved: ResolvedReference = {
		reference: { targetPath: ["text"], at: [], raw: "{text}" },
		outcomes: [
			{
				mode: "light",
				chain: {
					steps: [{ path: ["text"], file: "semantic.json", mode: "light" }],
					outcome: {
						kind: "resolved",
						value: { colorSpace: "srgb", components: [0, 0, 0] },
						type: "color",
					},
				},
				targetFile: "semantic.json",
			},
			{
				mode: "dark",
				chain: {
					steps: [],
					outcome: { kind: "unresolved", missingPath: ["dark", "override"] },
				},
				targetFile: undefined,
			},
		],
	};
	const { container } = render(<TokenReferenceValue resolved={resolved} />);
	await expectNoViolations(container);
});
