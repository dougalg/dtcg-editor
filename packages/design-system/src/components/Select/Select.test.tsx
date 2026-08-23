import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./Select.tsx";

function ExampleSelect(
	props: Partial<React.ComponentProps<typeof Select>> = {},
) {
	return (
		<Select {...props}>
			<SelectTrigger aria-label="Color space">
				<SelectValue placeholder="Pick a color space" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="srgb">sRGB</SelectItem>
				<SelectItem value="oklch">OKLCH</SelectItem>
			</SelectContent>
		</Select>
	);
}

test("renders a closed trigger showing the selected value's text", () => {
	render(<ExampleSelect defaultValue="srgb" />);
	const trigger = screen.getByRole("combobox", { name: "Color space" });
	expect(trigger.getAttribute("aria-expanded")).toBe("false");
	expect(screen.getByText("sRGB")).toBeTruthy();
});

test("disabled prevents opening", () => {
	render(<ExampleSelect defaultValue="srgb" disabled />);
	const trigger = screen.getByRole("combobox", {
		name: "Color space",
	}) as HTMLButtonElement;
	expect(trigger.disabled).toBe(true);
});

test("calls onValueChange when a new item is selected", () => {
	const onValueChange = vi.fn();
	render(<ExampleSelect defaultValue="srgb" onValueChange={onValueChange} />);
	const trigger = screen.getByRole("combobox", { name: "Color space" });
	fireEvent.pointerDown(
		trigger,
		new window.PointerEvent("pointerdown", {
			bubbles: true,
			cancelable: true,
			pointerId: 1,
			button: 0,
		}),
	);
	fireEvent.click(trigger);
	const option = screen.getByRole("option", { name: "OKLCH" });
	fireEvent.pointerUp(option);
	fireEvent.click(option);
	expect(onValueChange).toHaveBeenCalledWith("oklch");
});
