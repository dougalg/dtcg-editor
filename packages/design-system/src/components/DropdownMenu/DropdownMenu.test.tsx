import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, expect, test, vi } from "vitest";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./DropdownMenu.tsx";

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
	if (!Element.prototype.releasePointerCapture) {
		Element.prototype.releasePointerCapture = () => {};
	}
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
});

function renderMenu(onSelect?: () => void) {
	return render(
		<DropdownMenu>
			<DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onSelect={onSelect}>Rename</DropdownMenuItem>
				<DropdownMenuItem>Delete</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>,
	);
}

test("menu items are not rendered until the trigger is activated", () => {
	renderMenu();
	expect(screen.queryByText("Rename")).toBeNull();
});

test("clicking the trigger opens the menu and shows its items", () => {
	renderMenu();
	// Radix's Menu trigger opens on `pointerdown`, not `click` — jsdom's
	// `fireEvent.click` alone never dispatches a pointer event, so the menu
	// stays closed without this.
	fireEvent.pointerDown(screen.getByText("Open menu"), {
		button: 0,
		ctrlKey: false,
		pointerType: "mouse",
	});
	fireEvent.click(screen.getByText("Open menu"));
	expect(screen.getByRole("menu")).not.toBeNull();
	expect(screen.getByText("Rename")).not.toBeNull();
	expect(screen.getByText("Delete")).not.toBeNull();
});

test("selecting an item calls its onSelect handler and closes the menu", () => {
	const onSelect = vi.fn();
	renderMenu(onSelect);
	// Radix's Menu trigger opens on `pointerdown`, not `click` — jsdom's
	// `fireEvent.click` alone never dispatches a pointer event, so the menu
	// stays closed without this.
	fireEvent.pointerDown(screen.getByText("Open menu"), {
		button: 0,
		ctrlKey: false,
		pointerType: "mouse",
	});
	fireEvent.click(screen.getByText("Open menu"));
	fireEvent.click(screen.getByText("Rename"));
	expect(onSelect).toHaveBeenCalledTimes(1);
	expect(screen.queryByText("Rename")).toBeNull();
});
