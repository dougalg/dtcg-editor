import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import { ReferenceWarning } from "./ReferenceWarning.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations for an unresolved target", async () => {
	const { container } = render(
		<ReferenceWarning
			chain={{
				steps: [],
				outcome: { kind: "unresolved", missingPath: ["color", "nope"] },
			}}
		/>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations for a group target", async () => {
	const { container } = render(
		<ReferenceWarning
			chain={{
				steps: [],
				outcome: { kind: "group-target", groupPath: ["color", "group"] },
			}}
		/>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations for a circular reference", async () => {
	const { container } = render(
		<ReferenceWarning
			chain={{
				steps: [{ path: ["color", "a"], file: "a.json", mode: undefined }],
				outcome: { kind: "circular", cyclePath: ["color", "a"] },
			}}
		/>,
	);
	await expectNoViolations(container);
});

test("each warning is announced to assistive technology via role=alert", () => {
	const { getByRole } = render(
		<ReferenceWarning
			chain={{
				steps: [],
				outcome: { kind: "unresolved", missingPath: ["x"] },
			}}
		/>,
	);
	expect(getByRole("alert")).toBeTruthy();
});
