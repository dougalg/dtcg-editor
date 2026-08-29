import { COLOR_SPACES } from "@dtcg-editor/token-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ColorSpaceSelect } from "./ColorSpaceSelect.tsx";

function combo(): HTMLSelectElement {
	return screen.getByRole("combobox", {
		name: "Colour space",
	}) as HTMLSelectElement;
}

test("is a native select with an accessible name showing the current space", () => {
	render(
		<ColorSpaceSelect
			value="oklch"
			offered={[...COLOR_SPACES]}
			onChange={vi.fn()}
		/>,
	);
	expect(combo().tagName).toBe("SELECT");
	expect(combo().value).toBe("oklch");
});

test("lists all 14 spaces in canonical order by default", () => {
	render(
		<ColorSpaceSelect
			value="srgb"
			offered={[...COLOR_SPACES]}
			onChange={vi.fn()}
		/>,
	);
	expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
		...COLOR_SPACES,
	]);
});

test("lists only the restricted subset plus the current space", () => {
	render(
		<ColorSpaceSelect
			value="srgb"
			offered={["srgb", "hsl"]}
			onChange={vi.fn()}
		/>,
	);
	expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
		"srgb",
		"hsl",
	]);
});

test("emits onChange with the picked space", () => {
	const onChange = vi.fn();
	render(
		<ColorSpaceSelect
			value="srgb"
			offered={["srgb", "oklch"]}
			onChange={onChange}
		/>,
	);
	fireEvent.change(combo(), { target: { value: "oklch" } });
	expect(onChange).toHaveBeenCalledWith("oklch");
});

test("legacy mode shows a synthetic disabled 'hex' current entry", () => {
	render(
		<ColorSpaceSelect
			value="hex"
			offered={[...COLOR_SPACES]}
			onChange={vi.fn()}
		/>,
	);
	expect(combo().value).toBe("hex");
	const options = screen.getAllByRole("option");
	expect(options.map((o) => o.textContent)).toEqual(["hex", ...COLOR_SPACES]);
	expect((options[0] as HTMLOptionElement).disabled).toBe(true);
});
