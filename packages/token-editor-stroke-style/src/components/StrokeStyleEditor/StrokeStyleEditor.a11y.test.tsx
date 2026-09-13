import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { StrokeStyleEditor } from "./StrokeStyleEditor.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("named-style mode has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<StrokeStyleEditor value="dashed" onChange={vi.fn()} />,
	);
	await expectNoViolations(container);
});

test("custom-dash-pattern mode has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<StrokeStyleEditor
			value={{
				dashArray: [
					{ value: 4, unit: "px" },
					{ value: 2, unit: "px" },
				],
				lineCap: "round",
			}}
			onChange={vi.fn()}
		/>,
	);
	await expectNoViolations(container);
});
