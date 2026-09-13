import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { StrokeStylePreview } from "./StrokeStylePreview.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("a named-style preview has no WCAG 2.2 AA violations", async () => {
	const { container } = render(<StrokeStylePreview value="dashed" />);
	await expectNoViolations(container);
});

test("a custom dash-pattern preview has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<StrokeStylePreview
			value={{ dashArray: [{ value: 4, unit: "px" }], lineCap: "round" }}
		/>,
	);
	await expectNoViolations(container);
});
