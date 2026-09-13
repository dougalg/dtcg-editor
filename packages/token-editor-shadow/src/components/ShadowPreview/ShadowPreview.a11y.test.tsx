import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { ShadowPreview } from "./ShadowPreview.tsx";

const VALID_LAYER = {
	color: { colorSpace: "srgb", components: [1, 0, 0] },
	offsetX: { value: 0, unit: "px" },
	offsetY: { value: 2, unit: "px" },
	blur: { value: 4, unit: "px" },
	spread: { value: 0, unit: "px" },
};

test("has no WCAG 2.2 AA violations for a single-layer value", async () => {
	const { container } = render(<ShadowPreview value={VALID_LAYER} />);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("has no WCAG 2.2 AA violations for a multi-layer value", async () => {
	const { container } = render(
		<ShadowPreview value={[VALID_LAYER, VALID_LAYER]} />,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
