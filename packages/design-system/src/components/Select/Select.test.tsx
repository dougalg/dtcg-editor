import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Select, SelectContent, SelectItem } from "./Select.tsx";

function ExampleSelect(
	props: Partial<React.ComponentProps<typeof Select>> = {},
) {
	return (
		<Select aria-label="Color space" {...props}>
			<SelectContent>
				<SelectItem value="srgb">sRGB</SelectItem>
				<SelectItem value="oklch">OKLCH</SelectItem>
			</SelectContent>
		</Select>
	);
}

test("renders a native combobox showing the selected value's text", () => {
	render(<ExampleSelect defaultValue="srgb" />);
	const select = screen.getByRole("combobox", {
		name: "Color space",
	}) as HTMLSelectElement;
	expect(select.tagName).toBe("SELECT");
	expect(select.value).toBe("srgb");
	expect(screen.getByRole("option", { name: "sRGB" })).toBeTruthy();
});

test("disabled is reflected on the select element", () => {
	render(<ExampleSelect defaultValue="srgb" disabled />);
	expect(
		(screen.getByRole("combobox", { name: "Color space" }) as HTMLSelectElement)
			.disabled,
	).toBe(true);
});

test("calls onValueChange with the newly-selected value", () => {
	const onValueChange = vi.fn();
	render(<ExampleSelect defaultValue="srgb" onValueChange={onValueChange} />);
	fireEvent.change(screen.getByRole("combobox", { name: "Color space" }), {
		target: { value: "oklch" },
	});
	expect(onValueChange).toHaveBeenCalledWith("oklch");
});

test("forwards a raw onChange alongside onValueChange", () => {
	const onChange = vi.fn();
	const onValueChange = vi.fn();
	render(
		<ExampleSelect
			defaultValue="srgb"
			onChange={onChange}
			onValueChange={onValueChange}
		/>,
	);
	fireEvent.change(screen.getByRole("combobox", { name: "Color space" }), {
		target: { value: "oklch" },
	});
	expect(onChange).toHaveBeenCalledTimes(1);
	expect(onValueChange).toHaveBeenCalledWith("oklch");
});
