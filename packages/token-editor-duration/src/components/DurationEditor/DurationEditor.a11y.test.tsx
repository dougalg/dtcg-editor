import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { DurationEditor } from "./DurationEditor.tsx";

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<DurationEditor value={{ value: 200, unit: "ms" }} onChange={vi.fn()} />,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("a seconds value has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<DurationEditor value={{ value: 1.5, unit: "s" }} onChange={vi.fn()} />,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
