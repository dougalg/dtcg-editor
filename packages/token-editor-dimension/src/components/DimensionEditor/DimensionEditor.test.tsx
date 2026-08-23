import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { DimensionEditor } from "./DimensionEditor.tsx";

test("renders the current value and unit", () => {
	render(
		<DimensionEditor value={{ value: 16, unit: "px" }} onChange={vi.fn()} />,
	);

	expect((screen.getByLabelText("Value") as HTMLInputElement).value).toBe("16");
	expect((screen.getByLabelText("Unit") as HTMLSelectElement).value).toBe("px");
});

test("offers both px and rem units", () => {
	render(
		<DimensionEditor value={{ value: 1, unit: "rem" }} onChange={vi.fn()} />,
	);

	const select = screen.getByLabelText("Unit") as HTMLSelectElement;
	const offered = Array.from(select.options).map((option) => option.value);
	expect(offered).toEqual(["px", "rem"]);
});

test("editing the numeric value calls onChange with the updated value, unit preserved", () => {
	const onChange = vi.fn();
	render(
		<DimensionEditor value={{ value: 16, unit: "px" }} onChange={onChange} />,
	);

	const valueInput = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(valueInput, { target: { value: "24" } });

	expect(onChange).toHaveBeenCalledWith({ value: 24, unit: "px" });
});

test("a non-numeric value input is rejected by the number input itself, reporting an empty value", () => {
	const onChange = vi.fn();
	render(
		<DimensionEditor value={{ value: 16, unit: "px" }} onChange={onChange} />,
	);

	const valueInput = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(valueInput, { target: { value: "abc" } });

	expect(onChange).toHaveBeenCalledWith({ value: 0, unit: "px" });
});

test("changing the unit calls onChange with the updated unit, value preserved", () => {
	const onChange = vi.fn();
	render(
		<DimensionEditor value={{ value: 16, unit: "px" }} onChange={onChange} />,
	);

	const unitSelect = screen.getByLabelText("Unit") as HTMLSelectElement;
	fireEvent.change(unitSelect, { target: { value: "rem" } });

	expect(onChange).toHaveBeenCalledWith({ value: 16, unit: "rem" });
});

test("supports negative and fractional values", () => {
	const onChange = vi.fn();
	render(
		<DimensionEditor value={{ value: 0, unit: "px" }} onChange={onChange} />,
	);

	const valueInput = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(valueInput, { target: { value: "-0.5" } });

	expect(onChange).toHaveBeenCalledWith({ value: -0.5, unit: "px" });
});
