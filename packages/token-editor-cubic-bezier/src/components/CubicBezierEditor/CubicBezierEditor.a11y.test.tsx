import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { CubicBezierEditor } from "./CubicBezierEditor.tsx";

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={vi.fn()} />,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("an overshoot value has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<CubicBezierEditor value={[0.68, -0.55, 0.27, 1.55]} onChange={vi.fn()} />,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
