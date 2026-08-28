import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { ColorEditor } from "./ColorEditor.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("the object color editor (with alpha and an out-of-range channel) has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<ColorEditor
			value={{ colorSpace: "hsl", components: [400, 50, 40], alpha: 0.5 }}
			onChange={vi.fn()}
		/>,
	);
	await expectNoViolations(container);
});

test("the legacy hex color editor has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<ColorEditor value="#1f75cb" onChange={vi.fn()} />,
	);
	await expectNoViolations(container);
});
