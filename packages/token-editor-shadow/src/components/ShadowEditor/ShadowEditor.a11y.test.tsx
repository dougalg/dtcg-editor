import type { ShadowLayer } from "@dtcg-editor/token-core";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { ShadowEditor } from "./ShadowEditor.tsx";

const LAYER: ShadowLayer = {
	color: { colorSpace: "srgb", components: [0, 0, 0] },
	offsetX: { value: 0, unit: "px" },
	offsetY: { value: 2, unit: "px" },
	blur: { value: 4, unit: "px" },
	spread: { value: 0, unit: "px" },
};

test("has no WCAG 2.2 AA violations for a bare-object value", async () => {
	const { container } = render(
		<ShadowEditor value={LAYER} onChange={vi.fn()} />,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
