import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { RadioGroup, RadioGroupItem } from "./RadioGroup.tsx";

test("renders each item as a radio and marks the default value as checked", () => {
	render(
		<RadioGroup defaultValue="light" aria-label="Theme">
			<RadioGroupItem value="light" aria-label="Light" />
			<RadioGroupItem value="dark" aria-label="Dark" />
		</RadioGroup>,
	);
	const light = screen.getByRole("radio", { name: "Light" });
	const dark = screen.getByRole("radio", { name: "Dark" });
	expect(light.getAttribute("aria-checked")).toBe("true");
	expect(dark.getAttribute("aria-checked")).toBe("false");
});

test("calls onValueChange with the newly selected value when another item is clicked", () => {
	const onValueChange = vi.fn();
	render(
		<RadioGroup
			defaultValue="light"
			onValueChange={onValueChange}
			aria-label="Theme"
		>
			<RadioGroupItem value="light" aria-label="Light" />
			<RadioGroupItem value="dark" aria-label="Dark" />
		</RadioGroup>,
	);
	fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
	expect(onValueChange).toHaveBeenCalledWith("dark");
});

test("disabled prevents selection", () => {
	const onValueChange = vi.fn();
	render(
		<RadioGroup
			defaultValue="light"
			onValueChange={onValueChange}
			disabled
			aria-label="Theme"
		>
			<RadioGroupItem value="light" aria-label="Light" />
			<RadioGroupItem value="dark" aria-label="Dark" />
		</RadioGroup>,
	);
	fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
	expect(onValueChange).not.toHaveBeenCalled();
});
