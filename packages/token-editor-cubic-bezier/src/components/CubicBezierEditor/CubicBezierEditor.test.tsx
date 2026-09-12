import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { CubicBezierEditor } from "./CubicBezierEditor.tsx";

test("labels each of the four fields", () => {
	render(<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={vi.fn()} />);

	expect((screen.getByLabelText("P1x") as HTMLInputElement).value).toBe("0.4");
	expect((screen.getByLabelText("P1y") as HTMLInputElement).value).toBe("0");
	expect((screen.getByLabelText("P2x") as HTMLInputElement).value).toBe("0.2");
	expect((screen.getByLabelText("P2y") as HTMLInputElement).value).toBe("1");
});

test("renders the current value in four labeled fields", () => {
	render(<CubicBezierEditor value={[0.1, -2, 0.9, 3.5]} onChange={vi.fn()} />);

	expect((screen.getByLabelText("P1x") as HTMLInputElement).value).toBe("0.1");
	expect((screen.getByLabelText("P1y") as HTMLInputElement).value).toBe("-2");
	expect((screen.getByLabelText("P2x") as HTMLInputElement).value).toBe("0.9");
	expect((screen.getByLabelText("P2y") as HTMLInputElement).value).toBe("3.5");
});

test("editing P1x within range commits it exactly", () => {
	const onChange = vi.fn();
	render(<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P1x"), { target: { value: "0.6" } });

	expect(onChange).toHaveBeenCalledWith([0.6, 0, 0.2, 1]);
});

test("editing P1y calls onChange with only that coordinate changed", () => {
	const onChange = vi.fn();
	render(<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P1y"), {
		target: { value: "-0.5" },
	});

	expect(onChange).toHaveBeenCalledWith([0.4, -0.5, 0.2, 1]);
});

test("setting P1x above 1 clamps to 1", () => {
	const onChange = vi.fn();
	render(<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P1x"), { target: { value: "1.5" } });

	expect(onChange).toHaveBeenCalledWith([1, 0, 0.2, 1]);
});

test("setting P1x below 0 clamps to 0", () => {
	const onChange = vi.fn();
	render(<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P1x"), {
		target: { value: "-0.2" },
	});

	expect(onChange).toHaveBeenCalledWith([0, 0, 0.2, 1]);
});

test("setting P2x above 1 clamps to 1", () => {
	const onChange = vi.fn();
	render(<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P2x"), { target: { value: "1.5" } });

	expect(onChange).toHaveBeenCalledWith([0.4, 0, 1, 1]);
});

test("setting P2x below 0 clamps to 0", () => {
	const onChange = vi.fn();
	render(<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P2x"), {
		target: { value: "-0.2" },
	});

	expect(onChange).toHaveBeenCalledWith([0.4, 0, 0, 1]);
});

test("editing P1y accepts a negative value unclamped", () => {
	const onChange = vi.fn();
	render(<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P1y"), { target: { value: "-5" } });

	expect(onChange).toHaveBeenCalledWith([0.4, -5, 0.2, 1]);
});

test("editing P2y accepts a value greater than 1 unclamped", () => {
	const onChange = vi.fn();
	render(<CubicBezierEditor value={[0.4, 0, 0.2, 1]} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P2y"), { target: { value: "3.5" } });

	expect(onChange).toHaveBeenCalledWith([0.4, 0, 0.2, 3.5]);
});

test("a non-numeric value does not commit NaN", () => {
	const onChange = vi.fn();
	render(<CubicBezierEditor value={[0.4, 5, 0.2, 1]} onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("P1y"), {
		target: { value: "abc" },
	});

	expect(onChange).toHaveBeenCalledWith([0.4, 0, 0.2, 1]);
	const [emitted] = onChange.mock.calls[0] as [number[]];
	expect(Number.isNaN(emitted[1])).toBe(false);
});
