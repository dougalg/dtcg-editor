import type { ShadowLayer } from "@dtcg-editor/token-core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ShadowLayerFields } from "./ShadowLayerFields.tsx";

const LAYER: ShadowLayer = {
	color: { colorSpace: "srgb", components: [0, 0, 0] },
	offsetX: { value: 0, unit: "px" },
	offsetY: { value: 2, unit: "px" },
	blur: { value: 4, unit: "px" },
	spread: { value: 0, unit: "px" },
};

function getValueInputs() {
	return screen.getAllByLabelText("Value") as HTMLInputElement[];
}

test("renders the embedded ColorEditor and four DimensionEditor instances with each sub-field's current value", () => {
	render(<ShadowLayerFields value={LAYER} onChange={vi.fn()} />);

	// ColorEditor renders a "srgb R" channel input for an object color value.
	expect(screen.getByLabelText("srgb R")).toBeTruthy();

	// Four DimensionEditor "Value" inputs, one per offsetX/offsetY/blur/spread.
	const values = getValueInputs().map((el) => el.value);
	expect(values).toEqual(["0", "2", "4", "0"]);
});

test("wraps each dimension control in its own labeled fieldset — Offset X, Offset Y, Blur, Spread", () => {
	render(<ShadowLayerFields value={LAYER} onChange={vi.fn()} />);

	expect(screen.getByRole("group", { name: "Offset X" })).toBeTruthy();
	expect(screen.getByRole("group", { name: "Offset Y" })).toBeTruthy();
	expect(screen.getByRole("group", { name: "Blur" })).toBeTruthy();
	expect(screen.getByRole("group", { name: "Spread" })).toBeTruthy();
});

test("changing only offsetX calls onChange with offsetX updated, every other sub-field unchanged", () => {
	const onChange = vi.fn();
	render(<ShadowLayerFields value={LAYER} onChange={onChange} />);

	const offsetXGroup = screen.getByRole("group", { name: "Offset X" });
	const input = within(offsetXGroup).getByLabelText(
		"Value",
	) as HTMLInputElement;
	fireEvent.change(input, { target: { value: "10" } });

	expect(onChange).toHaveBeenCalledWith({
		...LAYER,
		offsetX: { value: 10, unit: "px" },
	});
});

test("changing only offsetY calls onChange with offsetY updated, every other sub-field unchanged", () => {
	const onChange = vi.fn();
	render(<ShadowLayerFields value={LAYER} onChange={onChange} />);

	const group = screen.getByRole("group", { name: "Offset Y" });
	const input = within(group).getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "10" } });

	expect(onChange).toHaveBeenCalledWith({
		...LAYER,
		offsetY: { value: 10, unit: "px" },
	});
});

test("changing only blur calls onChange with blur updated, every other sub-field unchanged", () => {
	const onChange = vi.fn();
	render(<ShadowLayerFields value={LAYER} onChange={onChange} />);

	const group = screen.getByRole("group", { name: "Blur" });
	const input = within(group).getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "10" } });

	expect(onChange).toHaveBeenCalledWith({
		...LAYER,
		blur: { value: 10, unit: "px" },
	});
});

test("changing only spread calls onChange with spread updated, every other sub-field unchanged", () => {
	const onChange = vi.fn();
	render(<ShadowLayerFields value={LAYER} onChange={onChange} />);

	const group = screen.getByRole("group", { name: "Spread" });
	const input = within(group).getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "10" } });

	expect(onChange).toHaveBeenCalledWith({
		...LAYER,
		spread: { value: 10, unit: "px" },
	});
});

test("changing only the color control calls onChange with color updated, every dimension sub-field unchanged", () => {
	const onChange = vi.fn();
	render(<ShadowLayerFields value={LAYER} onChange={onChange} />);

	const r = screen.getByLabelText("srgb R");
	fireEvent.focus(r);
	fireEvent.change(r, { target: { value: "0.5" } });
	fireEvent.blur(r);

	expect(onChange).toHaveBeenCalledWith({
		...LAYER,
		color: { colorSpace: "srgb", components: [0.5, 0, 0] },
	});
});
