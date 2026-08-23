import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { Label } from "./Label.tsx";

test("has no WCAG 2.2 AA violations when associated with a control", async () => {
	const { container } = render(
		<>
			<Label htmlFor="name">Name</Label>
			<input id="name" />
		</>,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
