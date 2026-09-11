import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { ColorPreview } from "./ColorPreview.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("a rendered color preview has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<ColorPreview
			value={{ colorSpace: "oklch", components: [0.7, 0.1, 180], alpha: 0.8 }}
		/>,
	);
	await expectNoViolations(container);
});
