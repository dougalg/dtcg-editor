import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { CubicBezierPreview } from "./CubicBezierPreview.tsx";

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(<CubicBezierPreview value={[0.4, 0, 0.2, 1]} />);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
