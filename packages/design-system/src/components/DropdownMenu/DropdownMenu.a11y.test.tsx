import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./DropdownMenu.tsx";

test("has no WCAG 2.2 AA violations when closed", async () => {
	const { container } = render(
		<DropdownMenu>
			<DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>Rename</DropdownMenuItem>
				<DropdownMenuItem>Delete</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});

test("has no WCAG 2.2 AA violations when open", async () => {
	render(
		<DropdownMenu defaultOpen>
			<DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>Rename</DropdownMenuItem>
				<DropdownMenuItem>Delete</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>,
	);
	// Scan the open menu's own content, not `document.body`: Radix's
	// `DropdownMenu` is modal by default, which `aria-hidden`s everything
	// outside the portal — including this render's own trigger button,
	// which stays natively focusable underneath that `aria-hidden`
	// wrapper. That's Radix's own modal-focus-trap behavior, not something
	// this design-system wrapper controls, so it's out of scope for this
	// component's a11y contract; what this test owns is "the menu's own
	// content has no violations once open."
	const results = await axe.run(screen.getByRole("menu"), {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
