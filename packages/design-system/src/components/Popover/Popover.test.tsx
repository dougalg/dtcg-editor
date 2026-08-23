import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, expect, test } from "vitest";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover.tsx";

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

function renderPopover() {
	return render(
		<Popover>
			<PopoverTrigger>Open settings</PopoverTrigger>
			<PopoverContent>Popover body content</PopoverContent>
		</Popover>,
	);
}

test("content is not rendered until the trigger is activated", () => {
	renderPopover();
	expect(screen.queryByText("Popover body content")).toBeNull();
});

test("clicking the trigger opens the popover and shows its content", () => {
	renderPopover();
	fireEvent.click(screen.getByText("Open settings"));
	expect(screen.getByText("Popover body content")).not.toBeNull();
});

test("pressing Escape closes an open popover", () => {
	renderPopover();
	fireEvent.click(screen.getByText("Open settings"));
	expect(screen.getByText("Popover body content")).not.toBeNull();

	fireEvent.keyDown(screen.getByText("Popover body content"), {
		key: "Escape",
		code: "Escape",
	});
	expect(screen.queryByText("Popover body content")).toBeNull();
});

test("defaultOpen renders the content immediately", () => {
	render(
		<Popover defaultOpen>
			<PopoverTrigger>Open settings</PopoverTrigger>
			<PopoverContent>Popover body content</PopoverContent>
		</Popover>,
	);
	expect(screen.getByText("Popover body content")).not.toBeNull();
});
