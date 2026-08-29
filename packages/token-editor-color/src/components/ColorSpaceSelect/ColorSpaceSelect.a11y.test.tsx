import { COLOR_SPACES } from "@dtcg-editor/token-core";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { ColorSpaceSelect } from "./ColorSpaceSelect.tsx";

test("the closed colour-space select has no WCAG 2.2 AA violations and an accessible name", async () => {
	const { container, getByRole } = render(
		<ColorSpaceSelect
			value="oklch"
			offered={[...COLOR_SPACES]}
			onChange={vi.fn()}
		/>,
	);
	expect(getByRole("combobox", { name: "Colour space" })).toBeTruthy();
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("the bracketing parentheses around the value are inert", () => {
	const { container } = render(
		<ColorSpaceSelect
			value="oklch"
			offered={[...COLOR_SPACES]}
			onChange={vi.fn()}
		>
			<span>0.7 0.15 145</span>
		</ColorSpaceSelect>,
	);
	const parens = [...container.querySelectorAll("span")].filter(
		(el) => el.textContent === "(" || el.textContent === ")",
	);
	expect(parens.map((el) => el.textContent)).toEqual(["(", ")"]);
	for (const el of parens) {
		expect(el.getAttribute("role")).toBeNull();
		expect(el.getAttribute("tabindex")).toBeNull();
	}
});
