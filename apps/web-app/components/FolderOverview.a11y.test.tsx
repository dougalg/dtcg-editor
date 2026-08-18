import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../lib/a11y/wcag-tags.ts";
import type { TokenFileSummary } from "../lib/tokens/scan.ts";
import { FolderOverview } from "./FolderOverview.tsx";

function files(): readonly TokenFileSummary[] {
	return [
		{ relativePath: "spacing.tokens.json", valid: true, standard: true },
		{
			relativePath: "broken.tokens.json",
			valid: false,
			error: "Invalid JSON",
		},
	];
}

test("has no WCAG 2.2 AA violations with a mix of valid and invalid files", async () => {
	const { container } = render(<FolderOverview files={files()} />);

	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});

	expect(results.violations).toEqual([]);
});

test("has no WCAG 2.2 AA violations when empty", async () => {
	const { container } = render(<FolderOverview files={[]} />);

	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});

	expect(results.violations).toEqual([]);
});
