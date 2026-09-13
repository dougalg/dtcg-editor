import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { TypographyEditor } from "./TypographyEditor.tsx";

const VALUE = {
	fontFamily: "Arial",
	fontSize: { value: 16, unit: "px" as const },
	fontWeight: 700,
	letterSpacing: { value: 0, unit: "px" as const },
	lineHeight: 1.4,
};

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<TypographyEditor value={VALUE} onChange={vi.fn()} />,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("the Font Size and Letter Spacing groups each expose a distinct accessible name", async () => {
	const { getByRole } = render(
		<TypographyEditor value={VALUE} onChange={vi.fn()} />,
	);
	expect(getByRole("group", { name: "Font Size" })).toBeTruthy();
	expect(getByRole("group", { name: "Letter Spacing" })).toBeTruthy();
});
