import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { FontWeightPreview } from "./FontWeightPreview.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("a numeric font weight preview has no WCAG 2.2 AA violations", async () => {
	const { container } = render(<FontWeightPreview value={700} />);
	await expectNoViolations(container);
});

test("an alias font weight preview has no WCAG 2.2 AA violations", async () => {
	const { container } = render(<FontWeightPreview value="bold" />);
	await expectNoViolations(container);
});
