import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { Switch } from "./Switch.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations when unchecked", async () => {
	const { container } = render(<Switch aria-label="Notifications" />);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations when checked", async () => {
	const { container } = render(
		<Switch aria-label="Notifications" defaultChecked />,
	);
	await expectNoViolations(container);
});
