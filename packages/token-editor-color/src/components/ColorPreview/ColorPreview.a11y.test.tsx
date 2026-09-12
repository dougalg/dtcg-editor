import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { ColorPreview } from "./ColorPreview.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("a rendered color preview has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<ColorPreview
			value={{ colorSpace: "oklch", components: [0.7, 0.1, 180], alpha: 0.8 }}
		/>,
	);
	await expectNoViolations(container);
});

// Kept alongside the has-alpha case above even though today's markup is
// DOM-structurally identical between the two (axe checks structure/contrast/
// ARIA, not color-string text content, so this can't currently catch a
// regression the has-alpha test wouldn't) — per-variant a11y coverage is
// this package's established convention (see ColorFunctionValue.a11y.test.tsx),
// and it's a low-cost tripwire if the alpha/no-alpha branches ever diverge
// structurally (e.g. an added "no alpha" indicator).
test("a color preview with no alpha has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<ColorPreview
			value={{ colorSpace: "srgb", components: [0.5, 0.2, 0.8] }}
		/>,
	);
	await expectNoViolations(container);
});

test("a legacy bare-hex color preview has no WCAG 2.2 AA violations", async () => {
	const { container } = render(<ColorPreview value="#3366ff" />);
	await expectNoViolations(container);
});
