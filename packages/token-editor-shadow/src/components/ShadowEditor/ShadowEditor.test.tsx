import type { ShadowLayer } from "@dtcg-editor/token-core";
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
