import type { ShadowLayer, ShadowValue } from "@dtcg-editor/token-core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ShadowEditor } from "./ShadowEditor.tsx";

const LAYER: ShadowLayer = {
	color: { colorSpace: "srgb", components: [0, 0, 0] },
	offsetX: { value: 0, unit: "px" },
	offsetY: { value: 2, unit: "px" },
	blur: { value: 4, unit: "px" },
	spread: { value: 0, unit: "px" },
};

function layer(overrides: Partial<ShadowLayer>): ShadowLayer {
	return { ...LAYER, ...overrides };
}

test("a bare-object value renders exactly one ShadowLayerFields block and no repeater controls", () => {
	render(<ShadowEditor value={LAYER} onChange={vi.fn()} />);

	expect(screen.getByRole("group", { name: "Offset X" })).toBeTruthy();
	expect(screen.queryByRole("button", { name: /add layer/i })).toBeNull();
	expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
	expect(screen.queryByRole("button", { name: /move up/i })).toBeNull();
	expect(screen.queryByRole("button", { name: /move down/i })).toBeNull();
});

test("a bare-object value's edit calls onChange with the updated bare object, not array-wrapped", () => {
	const onChange = vi.fn();
	render(<ShadowEditor value={LAYER} onChange={onChange} />);

	const group = screen.getByRole("group", { name: "Blur" });
	const input = within(group).getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "8" } });

	expect(onChange).toHaveBeenCalledWith({
		...LAYER,
		blur: { value: 8, unit: "px" },
	});
});

test("an array value renders one ShadowLayerFields row per layer plus repeater controls", () => {
	const value: ShadowValue = [
		layer({}),
		layer({ offsetY: { value: 4, unit: "px" } }),
	];
	render(<ShadowEditor value={value} onChange={vi.fn()} />);

	expect(screen.getAllByRole("group", { name: "Offset X" })).toHaveLength(2);
	expect(screen.getByRole("button", { name: /add layer/i })).toBeTruthy();
	expect(screen.getAllByRole("button", { name: /^remove$/i })).toHaveLength(2);
	expect(screen.getAllByRole("button", { name: /move up/i })).toHaveLength(2);
	expect(screen.getAllByRole("button", { name: /move down/i })).toHaveLength(2);
});

test("adding a layer to a two-layer array yields a 3-layer array, first two layers unchanged", () => {
	const value: ShadowValue = [
		layer({}),
		layer({ offsetY: { value: 4, unit: "px" } }),
	];
	const onChange = vi.fn();
	render(<ShadowEditor value={value} onChange={onChange} />);

	fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

	const emitted = onChange.mock.calls[0]?.[0] as ShadowLayer[];
	expect(emitted).toHaveLength(3);
	expect(emitted[0]).toEqual(value[0]);
	expect(emitted[1]).toEqual(value[1]);
	// The new third layer must itself be schema-valid (checked via shape).
	expect(emitted[2]).toMatchObject({
		color: expect.any(Object),
		offsetX: expect.any(Object),
		offsetY: expect.any(Object),
		blur: expect.any(Object),
		spread: expect.any(Object),
	});
});

test("removing the middle of three layers yields the first and third layers, unchanged and in order", () => {
	const value: ShadowValue = [
		layer({ offsetY: { value: 1, unit: "px" } }),
		layer({ offsetY: { value: 2, unit: "px" } }),
		layer({ offsetY: { value: 3, unit: "px" } }),
	];
	const onChange = vi.fn();
	render(<ShadowEditor value={value} onChange={onChange} />);

	const removeButtons = screen.getAllByRole("button", { name: /^remove$/i });
	fireEvent.click(removeButtons[1] as HTMLElement);

	expect(onChange).toHaveBeenCalledWith([value[0], value[2]]);
});

test("moving the first of two layers down swaps the layers without altering their values", () => {
	const value: ShadowValue = [
		layer({ offsetY: { value: 1, unit: "px" } }),
		layer({ offsetY: { value: 2, unit: "px" } }),
	];
	const onChange = vi.fn();
	render(<ShadowEditor value={value} onChange={onChange} />);

	const moveDownButtons = screen.getAllByRole("button", { name: /move down/i });
	fireEvent.click(moveDownButtons[0] as HTMLElement);

	expect(onChange).toHaveBeenCalledWith([value[1], value[0]]);
});

test("editing a sub-field of the second of two layers changes only that layer's field", () => {
	const value: ShadowValue = [
		layer({ offsetY: { value: 1, unit: "px" } }),
		layer({ offsetY: { value: 2, unit: "px" } }),
	];
	const onChange = vi.fn();
	render(<ShadowEditor value={value} onChange={onChange} />);

	const blurGroups = screen.getAllByRole("group", { name: "Blur" });
	const secondBlurInput = within(blurGroups[1] as HTMLElement).getByLabelText(
		"Value",
	) as HTMLInputElement;
	fireEvent.change(secondBlurInput, { target: { value: "12" } });

	expect(onChange).toHaveBeenCalledWith([
		value[0],
		{ ...value[1], blur: { value: 12, unit: "px" } },
	]);
});

test("remove is disabled when exactly one layer remains", () => {
	const value: ShadowValue = [layer({})];
	render(<ShadowEditor value={value} onChange={vi.fn()} />);

	const removeButton = screen.getByRole("button", {
		name: /^remove$/i,
	}) as HTMLButtonElement;
	expect(removeButton.disabled).toBe(true);
});

test("a one-item array value still shows repeater chrome, not the bare-object UI, and edits stay array-wrapped", () => {
	const value: ShadowValue = [layer({})];
	const onChange = vi.fn();
	render(<ShadowEditor value={value} onChange={onChange} />);

	// Repeater chrome present (Add layer button exists) even for one layer.
	expect(screen.getByRole("button", { name: /add layer/i })).toBeTruthy();

	const group = screen.getByRole("group", { name: "Blur" });
	const input = within(group).getByLabelText("Value") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "9" } });

	expect(onChange).toHaveBeenCalledWith([
		{ ...(value[0] as ShadowLayer), blur: { value: 9, unit: "px" } },
	]);
});
