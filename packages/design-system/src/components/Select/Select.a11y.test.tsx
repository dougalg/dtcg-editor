import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./Select.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations when closed", async () => {
	const { container } = render(
		<Select defaultValue="srgb">
			<SelectTrigger aria-label="Color space">
				<SelectValue placeholder="Pick a color space" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="srgb">sRGB</SelectItem>
				<SelectItem value="oklch">OKLCH</SelectItem>
			</SelectContent>
		</Select>,
	);
	await expectNoViolations(container);
});
