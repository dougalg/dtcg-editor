import {
	ColorEditor,
	type ColorEditorOptions,
	type ColorValue,
} from "@dtcg-editor/token-type-color";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";

/**
 * Exercises `ColorEditor`'s two `editorOptions`-driven halves (allow-list
 * dropdown restriction and the native color picker) directly, rather than
 * through `TokenTree.tsx` — these behaviors live entirely inside
 * `packages/token-type-color`, which has no JSX-capable test runner of its
 * own (`node --test` can't load `.tsx`), so `apps/web-app`'s Vitest/jsdom
 * setup is the nearest place that can render and interact with it.
 */

function StatefulColorEditor({
	initial,
	options,
}: {
	initial: ColorValue;
	options?: ColorEditorOptions;
}) {
	const [value, setValue] = useState(initial);
	return <ColorEditor value={value} onChange={setValue} options={options} />;
}

test("offers only the configured colorSpaces (AC-05)", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] }}
			onChange={vi.fn()}
			options={{ colorSpaces: ["srgb", "hsl"] }}
		/>,
	);

	const select = screen.getByLabelText("Color space") as HTMLSelectElement;
	const offered = Array.from(select.options).map((option) => option.value);
	expect(offered).toEqual(["srgb", "hsl"]);
});

test("offers all 14 spaces when no colorSpaces option is configured (FR-04 zero-config)", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] }}
			onChange={vi.fn()}
		/>,
	);

	const select = screen.getByLabelText("Color space") as HTMLSelectElement;
	expect(select.options.length).toBe(14);
});

test("a token using a colorSpace outside the allow-list stays editable, with its colorSpace as the active value (AC-06)", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "lab", components: [50, 40, -30] }}
			onChange={vi.fn()}
			options={{ colorSpaces: ["srgb"] }}
		/>,
	);

	const select = screen.getByLabelText("Color space") as HTMLSelectElement;
	expect(select.value).toBe("lab");
	const offered = Array.from(select.options).map((option) => option.value);
	expect(offered).toEqual(expect.arrayContaining(["lab", "srgb"]));

	// Other fields (components) remain editable.
	const componentInput = screen.getByLabelText(
		"lab component L",
	) as HTMLInputElement;
	expect(componentInput.disabled).toBe(false);
});

test("picking a color updates an srgb token's numeric components (AC-09)", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={onChange}
		/>,
	);

	const picker = screen.getByLabelText("Pick a color") as HTMLInputElement;
	fireEvent.change(picker, { target: { value: "#ff0000" } });

	expect(onChange).toHaveBeenCalledTimes(1);
	const next = onChange.mock.calls[0]?.[0] as { components: number[] };
	expect(next.components[0]).toBeCloseTo(1, 2);
	expect(next.components[1]).toBeCloseTo(0, 2);
	expect(next.components[2]).toBeCloseTo(0, 2);
});

test("picking a color updates a non-RGB (oklch) token's numeric components (AC-09)", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "oklch", components: [0.5, 0.1, 100] }}
			onChange={onChange}
		/>,
	);

	const picker = screen.getByLabelText("Pick a color") as HTMLInputElement;
	fireEvent.change(picker, { target: { value: "#3366cc" } });

	expect(onChange).toHaveBeenCalledTimes(1);
	const next = onChange.mock.calls[0]?.[0] as { components: number[] };
	for (const component of next.components) {
		expect(Number.isNaN(component)).toBe(false);
	}
	expect(next.components).not.toEqual([0.5, 0.1, 100]);
});

test("picking a color updates a wide-gamut (display-p3) token's numeric components (AC-09)", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "display-p3", components: [0, 0, 0] }}
			onChange={onChange}
		/>,
	);

	const picker = screen.getByLabelText("Pick a color") as HTMLInputElement;
	fireEvent.change(picker, { target: { value: "#ff0000" } });

	expect(onChange).toHaveBeenCalledTimes(1);
	const next = onChange.mock.calls[0]?.[0] as { components: number[] };
	for (const component of next.components) {
		expect(Number.isNaN(component)).toBe(false);
	}
	expect(next.components).not.toEqual([0, 0, 0]);
});

test("picking a color never changes alpha (AC-11)", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0], alpha: 0.4 }}
			onChange={onChange}
		/>,
	);

	const picker = screen.getByLabelText("Pick a color") as HTMLInputElement;
	fireEvent.change(picker, { target: { value: "#00ff00" } });

	expect(onChange).toHaveBeenCalledTimes(1);
	const next = onChange.mock.calls[0]?.[0] as { alpha: number };
	expect(next.alpha).toBe(0.4);
});

test("manually editing a numeric component field updates the picker's own displayed color (AC-10)", () => {
	render(
		<StatefulColorEditor
			initial={{ colorSpace: "srgb", components: [0, 0, 0] }}
		/>,
	);

	const picker = screen.getByLabelText("Pick a color") as HTMLInputElement;
	expect(picker.value).toBe("#000000");

	const redInput = screen.getByLabelText(
		"srgb component R",
	) as HTMLInputElement;
	fireEvent.change(redInput, { target: { value: "1" } });

	expect(picker.value).toBe("#ff0000");
});

test("switching colorSpace re-syncs the picker's displayed color", () => {
	render(
		<StatefulColorEditor
			initial={{ colorSpace: "srgb", components: [1, 0, 0] }}
		/>,
	);

	const picker = screen.getByLabelText("Pick a color") as HTMLInputElement;
	expect(picker.value).toBe("#ff0000");

	const select = screen.getByLabelText("Color space") as HTMLSelectElement;
	fireEvent.change(select, { target: { value: "hsl" } });

	// Same underlying red, now interpreted as hsl components [1, 0, 0] — a
	// very different color, so the picker's hex must change to reflect it.
	expect(picker.value).not.toBe("#ff0000");
});

test("the legacy hex path's picker matches the current bare-hex value and updates it on pick", () => {
	const onChange = vi.fn();
	render(<ColorEditor value="#1f75cb" onChange={onChange} />);

	const picker = screen.getByLabelText("Pick a color") as HTMLInputElement;
	expect(picker.value).toBe("#1f75cb");

	fireEvent.change(picker, { target: { value: "#abcdef" } });
	expect(onChange).toHaveBeenCalledWith("#abcdef");
});

test("a structurally valid but out-of-range component value stays editable, with the range issue visibly displayed (AC-05)", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "hsl", components: [400, 50, 40] }}
			onChange={vi.fn()}
		/>,
	);

	expect(screen.getByLabelText("hsl component H")).toBeTruthy();
	expect(screen.getByRole("alert").textContent).toMatch(
		/H\) must be >= 0 and < 360/,
	);
});

test("an in-range component value shows no range-issue alert", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.5, 0.2, 0.8] }}
			onChange={vi.fn()}
		/>,
	);

	expect(screen.queryByRole("alert")).toBeNull();
});
