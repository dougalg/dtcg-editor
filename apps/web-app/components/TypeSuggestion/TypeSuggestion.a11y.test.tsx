import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import { TypeSuggestion } from "./TypeSuggestion.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<TypeSuggestion inferredType="color" onAccept={() => {}} />,
	);
	await expectNoViolations(container);
});
