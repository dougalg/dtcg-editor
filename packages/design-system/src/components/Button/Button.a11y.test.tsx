import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { Button } from "./Button.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(<Button>Save</Button>);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations when disabled", async () => {
	const { container } = render(<Button disabled>Save</Button>);
	await expectNoViolations(container);
});
