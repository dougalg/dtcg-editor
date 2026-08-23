import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover.tsx";

test("has no WCAG 2.2 AA violations when closed", async () => {
	const { container } = render(
		<Popover>
			<PopoverTrigger>Open settings</PopoverTrigger>
			<PopoverContent>Popover body content</PopoverContent>
		</Popover>,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("has no WCAG 2.2 AA violations when open", async () => {
	render(
		<Popover defaultOpen>
			<PopoverTrigger>Open settings</PopoverTrigger>
			<PopoverContent>Popover body content</PopoverContent>
		</Popover>,
	);
	const results = await axe.run(document.body, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
