import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { TransitionEditor } from "./TransitionEditor.tsx";

const VALUE = {
	duration: { value: 200, unit: "ms" as const },
	delay: { value: 0, unit: "ms" as const },
	timingFunction: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<TransitionEditor value={VALUE} onChange={vi.fn()} />,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("the Duration and Delay groups each expose a distinct accessible name", async () => {
	const { getByRole } = render(
		<TransitionEditor value={VALUE} onChange={vi.fn()} />,
	);
	expect(getByRole("group", { name: "Duration" })).toBeTruthy();
	expect(getByRole("group", { name: "Delay" })).toBeTruthy();
});
