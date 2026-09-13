import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { NumberEditor } from "./NumberEditor.tsx";

test("renders the current value in a number input", () => {
	render(<NumberEditor value={1.5} onChange={vi.fn()} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	expect(input.value).toBe("1.5");
});

test("editing the value calls onChange with the updated finite number", () => {
	const onChange = vi.fn();
	render(<NumberEditor value={1.5} onChange={onChange} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "2" } });

	expect(onChange).toHaveBeenCalledWith(2);
});

test("entering a non-numeric value does not call onChange", () => {
	const onChange = vi.fn();
	render(<NumberEditor value={1.5} onChange={onChange} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "abc" } });

	expect(onChange).not.toHaveBeenCalled();
});

test("clearing the field does not call onChange", () => {
	const onChange = vi.fn();
	render(<NumberEditor value={1.5} onChange={onChange} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "" } });

	expect(onChange).not.toHaveBeenCalled();
});

test("entering a negative value calls onChange with that exact negative value", () => {
	const onChange = vi.fn();
	render(<NumberEditor value={1.5} onChange={onChange} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "-1" } });

	expect(onChange).toHaveBeenCalledWith(-1);
});

test("entering a fractional value calls onChange with that exact fractional value", () => {
	const onChange = vi.fn();
	render(<NumberEditor value={1.5} onChange={onChange} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "0.75" } });

	expect(onChange).toHaveBeenCalledWith(0.75);
});
