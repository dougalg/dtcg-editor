import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { FontFamilyEditor } from "./FontFamilyEditor.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("an empty list has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<FontFamilyEditor value={[]} onChange={vi.fn()} />,
	);
	await expectNoViolations(container);
});

test("a single-entry (string-sourced) list has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<FontFamilyEditor value="Helvetica" onChange={vi.fn()} />,
	);
	await expectNoViolations(container);
});

test("a multi-entry list has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<FontFamilyEditor
			value={["Helvetica", "Arial", "sans-serif"]}
			onChange={vi.fn()}
		/>,
	);
	await expectNoViolations(container);
});
