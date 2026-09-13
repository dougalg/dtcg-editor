import type { BorderValue } from "@dtcg-editor/token-core";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { BorderEditor } from "./BorderEditor.tsx";

const VALUE: BorderValue = {
	color: { colorSpace: "srgb", components: [0, 0, 0] },
	width: { value: 1, unit: "px" },
	style: "solid",
};

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<BorderEditor value={VALUE} onChange={vi.fn()} />,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("a border value with a custom dash-pattern style has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<BorderEditor
			value={{
				...VALUE,
				style: { dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" },
			}}
			onChange={vi.fn()}
		/>,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
