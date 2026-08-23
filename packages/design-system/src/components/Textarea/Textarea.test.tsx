import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Textarea } from "./Textarea.tsx";

test("renders a textarea and reflects its value", () => {
	render(<Textarea aria-label="Description" defaultValue="hello" />);
	const textarea = screen.getByRole("textbox", {
		name: "Description",
	}) as HTMLTextAreaElement;
	expect(textarea.tagName).toBe("TEXTAREA");
	expect(textarea.value).toBe("hello");
});

test("calls onChange with the new value when typed into", () => {
	const onChange = vi.fn();
	render(<Textarea aria-label="Description" onChange={onChange} />);
	const textarea = screen.getByRole("textbox", { name: "Description" });
	fireEvent.change(textarea, { target: { value: "new text" } });
	expect(onChange).toHaveBeenCalledTimes(1);
	expect((textarea as HTMLTextAreaElement).value).toBe("new text");
});

test("disabled prevents interaction", () => {
	render(<Textarea aria-label="Description" disabled />);
	const textarea = screen.getByRole("textbox", {
		name: "Description",
	}) as HTMLTextAreaElement;
	expect(textarea.disabled).toBe(true);
});
