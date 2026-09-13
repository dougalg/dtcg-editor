import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { BorderPreview } from "./BorderPreview.tsx";

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<BorderPreview
			value={{
				color: { colorSpace: "srgb", components: [1, 0, 0] },
				width: { value: 1, unit: "px" },
				style: "solid",
			}}
		/>,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
