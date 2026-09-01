import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, expect, test, vi } from "vitest";
import { Combobox, type ComboboxProps } from "./Combobox.tsx";

beforeAll(() => {
	if (!window.ResizeObserver) {
		window.ResizeObserver = class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
	}
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = () => false;
	}
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
});

interface Item {
	readonly id: string;
	readonly label: string;
}

const ITEMS: readonly Item[] = [
	{ id: "a", label: "alpha" },
	{ id: "b", label: "beta" },
	{ id: "c", label: "gamma" },
];

function props(
	overrides: Partial<ComboboxProps<Item>> = {},
): ComboboxProps<Item> {
	return {
		open: false,
		onOpenChange: vi.fn(),
		query: "",
		onQueryChange: vi.fn(),
		items: ITEMS,
		getKey: (it) => it.id,
		renderItem: (it) => it.label,
		onSelect: vi.fn(),
		inputLabel: "Search items",
		triggerLabel: "Choose an item",
		triggerContent: "Choose an item",
		emptyContent: "No items found",
		...overrides,
	};
}

test("clicking the trigger requests open; the trigger is a combobox with aria-expanded/controls", () => {
	const onOpenChange = vi.fn();
	render(<Combobox {...props({ onOpenChange })} />);

	const trigger = screen.getByRole("combobox", { name: "Choose an item" });
	expect(trigger.getAttribute("aria-expanded")).toBe("false");
	expect(trigger.getAttribute("aria-controls")).toBeTruthy();

	fireEvent.click(trigger);
	expect(onOpenChange).toHaveBeenCalledWith(true);
});

test("the search field shows the controlled query and reports typing via onQueryChange", () => {
	const onQueryChange = vi.fn();
	render(<Combobox {...props({ open: true, query: "al", onQueryChange })} />);

	const field = screen.getByRole("combobox", { name: "Search items" });
	expect((field as HTMLInputElement).value).toBe("al");

	fireEvent.change(field, { target: { value: "alp" } });
	expect(onQueryChange).toHaveBeenCalledWith("alp");
});
