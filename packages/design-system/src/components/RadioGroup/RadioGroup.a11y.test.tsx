import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { RadioGroup, RadioGroupItem } from "./RadioGroup.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<RadioGroup defaultValue="light" aria-label="Theme">
			<RadioGroupItem value="light" aria-label="Light" />
			<RadioGroupItem value="dark" aria-label="Dark" />
		</RadioGroup>,
	);
	await expectNoViolations(container);
});
