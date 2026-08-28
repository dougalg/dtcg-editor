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

const spaceSelect = (
	<span
		role="combobox"
		aria-label="Colour space"
		aria-expanded="false"
		tabIndex={0}
	>
		oklch
	</span>
);

test("the inline function value (no alpha) has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<ColorFunctionValue
			value={{ colorSpace: "oklch", components: [0.7, 0.15, 145] }}
			onComponentChange={vi.fn()}
			onAlphaChange={vi.fn()}
			spaceSelect={spaceSelect}
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
			spaceSelect={spaceSelect}
		/>,
	);
	await expectNoViolations(container);
});

test("the inert parentheses and separator have no interactive semantics", () => {
	const { container } = render(
		<ColorFunctionValue
			value={{ colorSpace: "oklch", components: [0.7, 0.15, 145] }}
			onComponentChange={vi.fn()}
			onAlphaChange={vi.fn()}
			spaceSelect={spaceSelect}
		/>,
	);
	for (const el of container.querySelectorAll("span")) {
		if (el.textContent === "(" || el.textContent === ")") {
			expect(el.getAttribute("role")).toBeNull();
			expect(el.getAttribute("tabindex")).toBeNull();
		}
	}
});
