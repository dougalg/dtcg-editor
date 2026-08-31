import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { FieldErrors } from "../../lib/tokens/staged-edits-store.ts";
import { FieldErrorSlot } from "./FieldErrorSlot.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

const NO_ERRORS: FieldErrors = { name: undefined, value: undefined };

test("has no WCAG 2.2 AA violations with an empty slot (U63)", async () => {
	const { container } = render(<FieldErrorSlot errors={NO_ERRORS} />);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations with name and value messages shown (U63)", async () => {
	const { container } = render(
		<FieldErrorSlot
			errors={{ name: "The name is taken.", value: "Not a valid dimension." }}
		/>,
	);
	await expectNoViolations(container);
});
