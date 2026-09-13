import type { BorderValue } from "@dtcg-editor/token-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { BorderEditor } from "./BorderEditor.tsx";

const VALUE: BorderValue = {
	color: { colorSpace: "srgb", components: [0, 0, 0] },
	width: { value: 1, unit: "px" },
	style: "solid",
};

test("renders the embedded ColorEditor, DimensionEditor, and StrokeStyleEditor with each sub-field's current value", () => {
	render(<BorderEditor value={VALUE} onChange={vi.fn()} />);

	// ColorEditor renders a "srgb R" channel input for an object color value.
	expect(screen.getByLabelText("srgb R")).toBeTruthy();
	// DimensionEditor renders "Value"/"Unit" fields.
	expect((screen.getByLabelText("Value") as HTMLInputElement).value).toBe("1");
	expect((screen.getByLabelText("Unit") as HTMLSelectElement).value).toBe("px");
	// StrokeStyleEditor renders a "Style" select for the named-keyword mode.
	expect((screen.getByLabelText("Style") as HTMLSelectElement).value).toBe(
		"solid",
	);
});

test("changing only the width control calls onChange with width updated, color and style unchanged", () => {
	const onChange = vi.fn();
	render(<BorderEditor value={VALUE} onChange={onChange} />);

	const valueInput = screen.getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(valueInput, { target: { value: "2" } });

	expect(onChange).toHaveBeenCalledWith({
		color: VALUE.color,
		width: { value: 2, unit: "px" },
		style: VALUE.style,
	});
});

test("changing only the color control calls onChange with color updated, width and style unchanged", () => {
	const onChange = vi.fn();
	render(<BorderEditor value={VALUE} onChange={onChange} />);

	const r = screen.getByLabelText("srgb R");
	fireEvent.focus(r);
	fireEvent.change(r, { target: { value: "0.5" } });
	fireEvent.blur(r);

	expect(onChange).toHaveBeenCalledWith({
		color: { colorSpace: "srgb", components: [0.5, 0, 0] },
		width: VALUE.width,
		style: VALUE.style,
	});
});

test("changing only the style control calls onChange with style updated, color and width unchanged", () => {
	const onChange = vi.fn();
	render(<BorderEditor value={VALUE} onChange={onChange} />);

	const styleSelect = screen.getByLabelText("Style") as HTMLSelectElement;
	fireEvent.change(styleSelect, { target: { value: "dashed" } });

	expect(onChange).toHaveBeenCalledWith({
		color: VALUE.color,
		width: VALUE.width,
		style: "dashed",
	});
});

test("composes correctly when style starts as the custom dash-pattern object form", () => {
	const customValue: BorderValue = {
		...VALUE,
		style: { dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" },
	};
	const onChange = vi.fn();
	render(<BorderEditor value={customValue} onChange={onChange} />);

	const dashInput = screen.getByLabelText("Dash segment 1") as HTMLInputElement;
	expect(dashInput.value).toBe("4");

	fireEvent.change(dashInput, { target: { value: "8" } });

	expect(onChange).toHaveBeenCalledWith({
		color: customValue.color,
		width: customValue.width,
		style: { dashArray: [{ value: 8, unit: "px" }], lineCap: "butt" },
	});
});
