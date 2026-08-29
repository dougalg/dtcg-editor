import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { Select, SelectContent, SelectItem } from "./Select.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations with an accessible name", async () => {
	const { container } = render(
		<Select aria-label="Color space" defaultValue="srgb">
			<SelectContent>
				<SelectItem value="srgb">sRGB</SelectItem>
				<SelectItem value="oklch">OKLCH</SelectItem>
			</SelectContent>
		</Select>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations when associated with a visible label", async () => {
	const { container } = render(
		// biome-ignore lint/a11y/noLabelWithoutControl: the control is the nested <select>.
		<label>
			Color space
			<Select defaultValue="srgb">
				<SelectContent>
					<SelectItem value="srgb">sRGB</SelectItem>
					<SelectItem value="oklch">OKLCH</SelectItem>
				</SelectContent>
			</Select>
		</label>,
	);
	await expectNoViolations(container);
});
