import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { DurationEditor } from "./DurationEditor.tsx";

test("renders the current value and unit", () => {
	render(
		<DurationEditor value={{ value: 200, unit: "ms" }} onChange={vi.fn()} />,
	);

	expect((screen.getByLabelText("Value") as HTMLInputElement).value).toBe(
		"200",
	);
	expect((screen.getByLabelText("Unit") as HTMLSelectElement).value).toBe("ms");
});

test("offers both ms and s units", () => {
	render(<DurationEditor value={{ value: 1, unit: "s" }} onChange={vi.fn()} />);

	const select = screen.getByLabelText("Unit") as HTMLSelectElement;
	const offered = Array.from(select.options).map((option) => option.value);
	expect(offered).toEqual(["ms", "s"]);
});

test("editing the numeric value calls onChange with the updated value, unit preserved", () => {
	const onChange = vi.fn();
	render(
		<DurationEditor value={{ value: 200, unit: "ms" }} onChange={onChange} />,
	);

	const valueInput = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(valueInput, { target: { value: "500" } });

	expect(onChange).toHaveBeenCalledWith({ value: 500, unit: "ms" });
});

test("a non-numeric value input is rejected by the number input itself, reporting an empty value", () => {
	const onChange = vi.fn();
	render(
		<DurationEditor value={{ value: 200, unit: "ms" }} onChange={onChange} />,
	);

	const valueInput = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(valueInput, { target: { value: "abc" } });

	expect(onChange).toHaveBeenCalledWith({ value: 0, unit: "ms" });
});

test("changing the unit calls onChange with the updated unit, value preserved", () => {
	const onChange = vi.fn();
	render(
		<DurationEditor value={{ value: 200, unit: "ms" }} onChange={onChange} />,
	);

	const unitSelect = screen.getByLabelText("Unit") as HTMLSelectElement;
	fireEvent.change(unitSelect, { target: { value: "s" } });

	expect(onChange).toHaveBeenCalledWith({ value: 200, unit: "s" });
});

test("supports fractional values", () => {
	const onChange = vi.fn();
	render(
		<DurationEditor value={{ value: 0, unit: "s" }} onChange={onChange} />,
	);

	const valueInput = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(valueInput, { target: { value: "1.5" } });

	expect(onChange).toHaveBeenCalledWith({ value: 1.5, unit: "s" });
});

test("rejects a negative value: onChange never receives a value below zero", () => {
	const onChange = vi.fn();
	render(
		<DurationEditor value={{ value: 200, unit: "ms" }} onChange={onChange} />,
	);

	const valueInput = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(valueInput, { target: { value: "-50" } });

	expect(onChange).not.toHaveBeenCalledWith({ value: -50, unit: "ms" });
	// The last (only, since the negative edit was rejected) call, if any,
	// must never carry a negative value.
	for (const call of onChange.mock.calls) {
		expect(call[0].value).toBeGreaterThanOrEqual(0);
	}
});
