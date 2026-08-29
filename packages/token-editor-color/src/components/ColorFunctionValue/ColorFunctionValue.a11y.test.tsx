import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { ColorFunctionValue } from "./ColorFunctionValue.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("the inline function value (no alpha) has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<ColorFunctionValue
			value={{ colorSpace: "oklch", components: [0.7, 0.15, 145] }}
			onComponentChange={vi.fn()}
			onAlphaChange={vi.fn()}
		/>,
	);
	await expectNoViolations(container);
});

test("the inline function value with alpha has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<ColorFunctionValue
			value={{ colorSpace: "oklch", components: [0.7, 0.15, 145], alpha: 0.5 }}
			onComponentChange={vi.fn()}
			onAlphaChange={vi.fn()}
		/>,
	);
	await expectNoViolations(container);
});

test("the inert `/` separator and padding glyphs have no interactive semantics", () => {
	const { container } = render(
		<ColorFunctionValue
			value={{ colorSpace: "oklch", components: [0.7, 0.15, 145], alpha: 0.5 }}
			onComponentChange={vi.fn()}
			onAlphaChange={vi.fn()}
		/>,
	);
	for (const el of container.querySelectorAll("span")) {
		if (el.textContent?.trim() === "/" || el.textContent === " ") {
			expect(el.getAttribute("role")).toBeNull();
			expect(el.getAttribute("tabindex")).toBeNull();
		}
	}
});
