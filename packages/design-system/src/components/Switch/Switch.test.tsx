import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Switch } from "./Switch.tsx";

test("renders a switch reflecting its checked state", () => {
	render(<Switch aria-label="Notifications" defaultChecked />);
	const toggle = screen.getByRole("switch", { name: "Notifications" });
	expect(toggle.getAttribute("aria-checked")).toBe("true");
});

test("calls onCheckedChange with the flipped state when clicked", () => {
	const onCheckedChange = vi.fn();
	render(
		<Switch
			aria-label="Notifications"
			defaultChecked={false}
			onCheckedChange={onCheckedChange}
		/>,
	);
	fireEvent.click(screen.getByRole("switch", { name: "Notifications" }));
	expect(onCheckedChange).toHaveBeenCalledWith(true);
});

test("disabled prevents toggling", () => {
	const onCheckedChange = vi.fn();
	render(
		<Switch
			aria-label="Notifications"
			defaultChecked={false}
			disabled
			onCheckedChange={onCheckedChange}
		/>,
	);
	const toggle = screen.getByRole("switch", {
		name: "Notifications",
	}) as HTMLButtonElement;
	expect(toggle.disabled).toBe(true);
	fireEvent.click(toggle);
	expect(onCheckedChange).not.toHaveBeenCalled();
});
