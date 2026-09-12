import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { FontWeightEditor } from "./FontWeightEditor.tsx";

test("renders the current value in a number input with the DTCG range attributes", () => {
	render(<FontWeightEditor value={400} onChange={vi.fn()} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	expect(input.value).toBe("400");
	expect(input.min).toBe("1");
	expect(input.max).toBe("1000");
	expect(input.step).toBe("1");
});

test("editing the numeric value calls onChange with the updated integer", () => {
	const onChange = vi.fn();
	render(<FontWeightEditor value={400} onChange={onChange} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "700" } });

	expect(onChange).toHaveBeenCalledWith(700);
});

test("entering a non-numeric value does not call onChange", () => {
	const onChange = vi.fn();
	render(<FontWeightEditor value={400} onChange={onChange} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "abc" } });

	expect(onChange).not.toHaveBeenCalled();
});

test("entering a non-integer numeric value does not call onChange", () => {
	const onChange = vi.fn();
	render(<FontWeightEditor value={400} onChange={onChange} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "400.5" } });

	expect(onChange).not.toHaveBeenCalled();
});

test("entering an out-of-range integer does not call onChange", () => {
	const onChange = vi.fn();
	render(<FontWeightEditor value={400} onChange={onChange} />);

	const input = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "1001" } });
	fireEvent.change(input, { target: { value: "0" } });

	expect(onChange).not.toHaveBeenCalled();
});
