import { render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { Combobox } from "./Combobox.tsx";

interface Item {
	readonly id: string;
	readonly label: string;
}

const ITEMS: readonly Item[] = [
	{ id: "a", label: "alpha" },
	{ id: "b", label: "beta" },
	{ id: "c", label: "gamma" },
];

function Harness({
	loading = false,
	items = ITEMS,
	disableBeta = false,
	startOpen = true,
}: {
	loading?: boolean;
	items?: readonly Item[];
	disableBeta?: boolean;
	startOpen?: boolean;
}) {
	const [open, setOpen] = useState(startOpen);
	const [query, setQuery] = useState("");
	return (
		<Combobox
			open={open}
			onOpenChange={setOpen}
			query={query}
			onQueryChange={setQuery}
			items={items}
			getKey={(it) => it.id}
			renderItem={(it) => it.label}
			isItemDisabled={disableBeta ? (it) => it.id === "b" : undefined}
			onSelect={vi.fn()}
			inputLabel="Search items"
			triggerLabel="Choose an item"
			triggerContent="Choose an item"
			emptyContent="No items found"
			loading={loading}
			loadingContent="Loading…"
		/>
	);
}

async function expectNoViolations() {
	const results = await axe.run(document.body, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("open populated popover has no WCAG 2.2 AA violations", async () => {
	render(<Harness />);
	await expectNoViolations();
});

test("open empty popover has no WCAG 2.2 AA violations", async () => {
	render(<Harness items={[]} />);
	await expectNoViolations();
});

test("open popover with a disabled row has no WCAG 2.2 AA violations", async () => {
	render(<Harness disableBeta />);
	await expectNoViolations();
});

test("ArrowDown moves over enabled items and skips a disabled one", async () => {
	render(<Harness disableBeta />);
	const field = screen.getByRole("combobox", { name: "Search items" });
	field.focus();

	const arrowDown = () =>
		field.dispatchEvent(
			new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
		);

	arrowDown();
	await waitFor(() =>
		expect(
			screen
				.getByRole("option", { name: "alpha" })
				.getAttribute("aria-selected"),
		).toBe("true"),
	);

	arrowDown();
	await waitFor(() =>
		expect(
			screen
				.getByRole("option", { name: /gamma/ })
				.getAttribute("aria-selected"),
		).toBe("true"),
	);
	expect(
		screen.getByRole("option", { name: "beta" }).getAttribute("aria-selected"),
	).not.toBe("true");
});
