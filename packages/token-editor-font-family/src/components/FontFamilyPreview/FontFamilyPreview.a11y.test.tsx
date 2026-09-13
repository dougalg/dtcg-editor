import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { FontFamilyPreview } from "./FontFamilyPreview.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("a string value preview has no WCAG 2.2 AA violations", async () => {
	const { container } = render(<FontFamilyPreview value="Helvetica" />);
	await expectNoViolations(container);
});

test("a long-list preview (with the +N more indicator) has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<FontFamilyPreview
			value={["Helvetica", "Arial", "Verdana", "Tahoma", "sans-serif"]}
		/>,
	);
	await expectNoViolations(container);
});
