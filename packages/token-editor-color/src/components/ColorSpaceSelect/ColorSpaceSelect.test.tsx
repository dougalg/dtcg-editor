import { COLOR_SPACES } from "@dtcg-editor/token-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ColorSpaceSelect } from "./ColorSpaceSelect.tsx";

function open(): void {
	const trigger = screen.getByRole("combobox", { name: "Colour space" });
	fireEvent.pointerDown(
		trigger,
		new window.PointerEvent("pointerdown", {
			bubbles: true,
			cancelable: true,
			pointerId: 1,
			button: 0,
		}),
	);
	fireEvent.click(trigger);
}

test("has an accessible name and shows the current space", () => {
	render(
		<ColorSpaceSelect
			value="oklch"
			offered={[...COLOR_SPACES]}
			onChange={vi.fn()}
		/>,
	);
	const trigger = screen.getByRole("combobox", { name: "Colour space" });
	expect(trigger.textContent).toContain("oklch");
});

test("lists all 14 spaces in canonical order by default", () => {
	render(
		<ColorSpaceSelect
			value="srgb"
			offered={[...COLOR_SPACES]}
			onChange={vi.fn()}
		/>,
	);
	open();
	const options = screen.getAllByRole("option").map((o) => o.textContent);
	expect(options).toEqual([...COLOR_SPACES]);
});

test("lists only the restricted subset plus the current space", () => {
	render(
		<ColorSpaceSelect
			value="srgb"
			offered={["srgb", "hsl"]}
			onChange={vi.fn()}
		/>,
	);
	open();
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
	open();
	const option = screen.getByRole("option", { name: "oklch" });
	fireEvent.pointerUp(option);
	fireEvent.click(option);
	expect(onChange).toHaveBeenCalledWith("oklch");
});

test("legacy mode shows a synthetic 'hex' current entry", () => {
	render(
		<ColorSpaceSelect
			value="hex"
			offered={[...COLOR_SPACES]}
			onChange={vi.fn()}
		/>,
	);
	const trigger = screen.getByRole("combobox", { name: "Colour space" });
	expect(trigger.textContent).toContain("hex");
	open();
	expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
		"hex",
		...COLOR_SPACES,
	]);
});
