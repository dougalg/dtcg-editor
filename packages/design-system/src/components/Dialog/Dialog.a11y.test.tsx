import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "./Dialog.tsx";

test("has no WCAG 2.2 AA violations when open", async () => {
	render(
		<Dialog defaultOpen>
			<DialogContent>
				<DialogTitle>Confirm</DialogTitle>
				<DialogDescription>Are you sure?</DialogDescription>
			</DialogContent>
		</Dialog>,
	);
	// Radix portals DialogContent (plus its backdrop) to document.body, so
	// the a11y check must scan the whole document, not the local container.
	const results = await axe.run(document.body, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
