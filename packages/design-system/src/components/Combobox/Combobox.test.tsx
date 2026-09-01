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

test("renders exactly the items given, in the given order, with no internal filtering", () => {
	render(
		<Combobox
			{...props({ open: true, query: "zzz-no-match", items: ITEMS })}
		/>,
	);

	const options = screen.getAllByRole("option");
	expect(options.map((o) => o.textContent)).toEqual(["alpha", "beta", "gamma"]);
});

test("activating an enabled item calls onSelect with it, then closes the popover", () => {
	const onSelect = vi.fn();
	const onOpenChange = vi.fn();
	render(<Combobox {...props({ open: true, onSelect, onOpenChange })} />);

	fireEvent.click(screen.getByRole("option", { name: "beta" }));

	expect(onSelect).toHaveBeenCalledWith(ITEMS[1]);
	expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("pressing Escape requests close", () => {
	const onOpenChange = vi.fn();
	render(<Combobox {...props({ open: true, onOpenChange })} />);

	fireEvent.keyDown(screen.getByRole("combobox", { name: "Search items" }), {
		key: "Escape",
	});

	expect(onOpenChange).toHaveBeenCalledWith(false);
});

const disableBeta = (it: Item) => it.id === "b";

test("a disabled item is still rendered", () => {
	render(<Combobox {...props({ open: true, isItemDisabled: disableBeta })} />);

	const beta = screen.getByRole("option", { name: "beta" });
	expect(beta).toBeTruthy();
	expect(beta.getAttribute("aria-disabled")).toBe("true");
});

test("activating a disabled item never calls onSelect and does not close", () => {
	const onSelect = vi.fn();
	const onOpenChange = vi.fn();
	render(
		<Combobox
			{...props({
				open: true,
				onSelect,
				onOpenChange,
				isItemDisabled: disableBeta,
			})}
		/>,
	);

	fireEvent.click(screen.getByRole("option", { name: "beta" }));

	expect(onSelect).not.toHaveBeenCalled();
	expect(onOpenChange).not.toHaveBeenCalledWith(false);
});

test("selectedKey marks exactly that row as the current selection", () => {
	render(<Combobox {...props({ open: true, selectedKey: "c" })} />);

	expect(
		screen.getByRole("option", { name: /gamma/ }).getAttribute("aria-current"),
	).toBe("true");
	expect(
		screen.getByRole("option", { name: "alpha" }).getAttribute("aria-current"),
	).toBeNull();
});

test("loading shows loadingContent and neither the item list nor emptyContent", () => {
	render(
		<Combobox
			{...props({
				open: true,
				loading: true,
				loadingContent: "Loading…",
			})}
		/>,
	);

	expect(screen.getByText("Loading…")).toBeTruthy();
	expect(screen.queryAllByRole("option")).toHaveLength(0);
	expect(screen.queryByText("No items found")).toBeNull();
});

test("empty items (not loading) shows emptyContent and nothing selectable", () => {
	render(<Combobox {...props({ open: true, items: [] })} />);

	expect(screen.getByText("No items found")).toBeTruthy();
	expect(screen.queryAllByRole("option")).toHaveLength(0);
});
