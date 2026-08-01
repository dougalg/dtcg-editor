import { expect, test, vi } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { dimensionTokenType } from "@dtcg-editor/token-type-dimension";
import { colorTokenType } from "@dtcg-editor/token-type-color";
import { WCAG_22_AA_TAGS } from "../a11y/wcag-tags.ts";

test("the built-in dimension editor has no WCAG 2.2 AA violations", async () => {
	const Editor = dimensionTokenType.Editor;
	const { container } = render(
		<Editor value={{ value: 4, unit: "px" }} onChange={vi.fn()} />,
	);

	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});

	expect(results.violations).toEqual([]);
});

test("the built-in color editor has no WCAG 2.2 AA violations", async () => {
	const Editor = colorTokenType.Editor;
	const { container } = render(
		<Editor
			value={{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] }}
			onChange={vi.fn()}
		/>,
	);

	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});

	expect(results.violations).toEqual([]);
});
