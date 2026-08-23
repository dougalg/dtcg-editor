import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ColorEditor } from "./ColorEditor.tsx";

test("renders a select offering every color space when unconfigured", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.2, 0.4, 0.9] }}
			onChange={vi.fn()}
		/>,
	);

	const select = screen.getByLabelText("Color space") as HTMLSelectElement;
	expect(select.value).toBe("srgb");
	expect(select.options.length).toBe(14);
});

test("restricts the offered color spaces to the configured allow-list", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={vi.fn()}
			options={{ colorSpaces: ["srgb", "hsl"] }}
		/>,
	);

	const select = screen.getByLabelText("Color space") as HTMLSelectElement;
	const offered = Array.from(select.options).map((option) => option.value);
	expect(offered).toEqual(["srgb", "hsl"]);
});

test("editing a numeric component calls onChange with the updated components", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={onChange}
		/>,
	);

	const redInput = screen.getByLabelText(
		"srgb component R",
	) as HTMLInputElement;
	fireEvent.change(redInput, { target: { value: "0.5" } });

	expect(onChange).toHaveBeenCalledWith({
		colorSpace: "srgb",
		components: [0.5, 0, 0],
	});
});

test("toggling a component to 'none' disables its numeric input and reports 'none'", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.5, 0, 0] }}
			onChange={onChange}
		/>,
	);

	const noneToggle = screen.getByLabelText("R is none") as HTMLInputElement;
	fireEvent.click(noneToggle);

	expect(onChange).toHaveBeenCalledWith({
		colorSpace: "srgb",
		components: ["none", 0, 0],
	});
});

test("toggling 'Has alpha' on adds a default alpha field and value", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={onChange}
		/>,
	);

	expect(screen.queryByLabelText("Alpha")).toBeNull();
	fireEvent.click(screen.getByLabelText("Has alpha"));
	expect(onChange).toHaveBeenCalledWith({
		colorSpace: "srgb",
		components: [0, 0, 0],
		alpha: 1,
	});
});

test("toggling 'Has alpha' off removes the alpha field from the value", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0], alpha: 0.5 }}
			onChange={onChange}
		/>,
	);

	fireEvent.click(screen.getByLabelText("Has alpha"));
	expect(onChange).toHaveBeenCalledWith({
		colorSpace: "srgb",
		components: [0, 0, 0],
	});
});

test("entering a valid hex value calls onChange with the hex field set", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={onChange}
		/>,
	);

	const hexInput = screen.getByLabelText("Hex (optional)") as HTMLInputElement;
	fireEvent.change(hexInput, { target: { value: "#ff0000" } });

	expect(onChange).toHaveBeenCalledWith({
		colorSpace: "srgb",
		components: [0, 0, 0],
		hex: "#ff0000",
	});
});

test("an incomplete hex value does not call onChange (still typing)", () => {
	const onChange = vi.fn();
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0, 0, 0] }}
			onChange={onChange}
		/>,
	);

	const hexInput = screen.getByLabelText("Hex (optional)") as HTMLInputElement;
	fireEvent.change(hexInput, { target: { value: "#ff" } });

	expect(onChange).not.toHaveBeenCalled();
	expect(hexInput.value).toBe("#ff");
});

test("an out-of-range component value shows a visible range-issue alert", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "hsl", components: [400, 50, 40] }}
			onChange={vi.fn()}
		/>,
	);

	expect(screen.getByRole("alert").textContent).toMatch(
		/H\) must be >= 0 and < 360/,
	);
});

test("an in-range value shows no range-issue alert", () => {
	render(
		<ColorEditor
			value={{ colorSpace: "srgb", components: [0.5, 0.2, 0.8] }}
			onChange={vi.fn()}
		/>,
	);

	expect(screen.queryByRole("alert")).toBeNull();
});

test("a legacy bare-hex string value renders the legacy hex field, not the object editor", () => {
	render(<ColorEditor value="#1f75cb" onChange={vi.fn()} />);

	expect(
		(screen.getByLabelText("Legacy hex value") as HTMLInputElement).value,
	).toBe("#1f75cb");
	expect(screen.queryByLabelText("Color space")).toBeNull();
});

test("editing a valid legacy hex value calls onChange with the new hex string", () => {
	const onChange = vi.fn();
	render(<ColorEditor value="#1f75cb" onChange={onChange} />);

	const hexInput = screen.getByLabelText(
		"Legacy hex value",
	) as HTMLInputElement;
	fireEvent.change(hexInput, { target: { value: "#abcdef" } });

	expect(onChange).toHaveBeenCalledWith("#abcdef");
});
