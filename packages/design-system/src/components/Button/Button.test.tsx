import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Button } from "./Button.tsx";

test("renders its children as a button with the button slot", () => {
	render(<Button>Save</Button>);
	const button = screen.getByRole("button", { name: "Save" });
	expect(button.tagName).toBe("BUTTON");
	expect(button.dataset.slot).toBe("button");
});

test("calls onClick when clicked", () => {
	const onClick = vi.fn();
	render(<Button onClick={onClick}>Save</Button>);
	fireEvent.click(screen.getByRole("button", { name: "Save" }));
	expect(onClick).toHaveBeenCalledTimes(1);
});

test("disabled prevents the click handler from firing", () => {
	const onClick = vi.fn();
	render(
		<Button onClick={onClick} disabled>
			Save
		</Button>,
	);
	const button = screen.getByRole("button", {
		name: "Save",
	}) as HTMLButtonElement;
	expect(button.disabled).toBe(true);
	fireEvent.click(button);
	expect(onClick).not.toHaveBeenCalled();
});

test("asChild renders through Slot onto the passed child element instead of a button", () => {
	render(
		<Button asChild>
			<a href="/save">Save</a>
		</Button>,
	);
	const button = screen.getByRole("link", { name: "Save" });
	expect(button.tagName).toBe("A");
	expect(button.dataset.slot).toBe("button");
});
