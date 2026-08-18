import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SaveButton } from "./SaveButton.tsx";

afterEach(() => {
	cleanup();
});

test("renders the idle label and calls onClick when enabled", () => {
	const onClick = vi.fn();
	render(<SaveButton onClick={onClick} disabled={false} pending={false} />);

	const button = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(button.disabled).toBe(false);

	fireEvent.click(button);
	expect(onClick).toHaveBeenCalledTimes(1);
});

test("renders the pending label and stays disabled while saving", () => {
	const onClick = vi.fn();
	render(<SaveButton onClick={onClick} disabled={true} pending={true} />);

	const button = screen.getByRole("button", {
		name: /saving/i,
	}) as HTMLButtonElement;
	expect(button.disabled).toBe(true);

	fireEvent.click(button);
	expect(onClick).not.toHaveBeenCalled();
});

test("is disabled when there are no pending edits, independent of pending state", () => {
	render(<SaveButton onClick={vi.fn()} disabled={true} pending={false} />);

	const button = screen.getByRole("button", {
		name: /save/i,
	}) as HTMLButtonElement;
	expect(button.disabled).toBe(true);
});
