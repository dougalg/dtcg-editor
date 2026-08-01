import { expect, test, vi } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { SaveButton } from "./SaveButton.tsx";
import { WCAG_22_AA_TAGS } from "../lib/a11y/wcag-tags.ts";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations when enabled", async () => {
	const { container } = render(
		<SaveButton onClick={vi.fn()} disabled={false} pending={false} />,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations when disabled and pending", async () => {
	const { container } = render(
		<SaveButton onClick={vi.fn()} disabled={true} pending={true} />,
	);
	await expectNoViolations(container);
});
