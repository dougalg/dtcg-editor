import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StrokeStyleEditor } from "./StrokeStyleEditor.tsx";

test("renders the named-style mode selected with the current keyword shown", () => {
	render(<StrokeStyleEditor value="dashed" onChange={vi.fn()} />);

	const named = screen.getByRole("radio", { name: "Named style" });
	expect(named.getAttribute("aria-checked")).toBe("true");

	const style = screen.getByLabelText("Style") as HTMLSelectElement;
	expect(style.value).toBe("dashed");
});

test("offers all 8 named styles in the style select", () => {
	render(<StrokeStyleEditor value="solid" onChange={vi.fn()} />);

	const style = screen.getByLabelText("Style") as HTMLSelectElement;
	const offered = Array.from(style.options).map((option) => option.value);
	expect(offered).toEqual([
		"solid",
		"dashed",
		"dotted",
		"double",
		"groove",
		"ridge",
		"outset",
		"inset",
	]);
});

test("selecting a different named style calls onChange with that exact string", () => {
	const onChange = vi.fn();
	render(<StrokeStyleEditor value="solid" onChange={onChange} />);

	const style = screen.getByLabelText("Style") as HTMLSelectElement;
	fireEvent.change(style, { target: { value: "dotted" } });

	expect(onChange).toHaveBeenCalledWith("dotted");
});

test("renders the custom-dash-pattern mode selected with dash entries and line cap shown", () => {
	render(
		<StrokeStyleEditor
			value={{
				dashArray: [
					{ value: 4, unit: "px" },
					{ value: 2, unit: "px" },
				],
				lineCap: "round",
			}}
			onChange={vi.fn()}
		/>,
	);

	const custom = screen.getByRole("radio", { name: "Custom dash pattern" });
	expect(custom.getAttribute("aria-checked")).toBe("true");

	expect(screen.getByLabelText("Dash segment 1")).toHaveProperty("value", "4");
	expect(screen.getByLabelText("Dash segment 1 unit")).toHaveProperty(
		"value",
		"px",
	);
	expect(screen.getByLabelText("Dash segment 2")).toHaveProperty("value", "2");
	expect(screen.getByLabelText("Line cap")).toHaveProperty("value", "round");
});

test("switching to custom-dash-pattern mode calls onChange with a default dash object", () => {
	const onChange = vi.fn();
	render(<StrokeStyleEditor value="solid" onChange={onChange} />);

	fireEvent.click(screen.getByRole("radio", { name: "Custom dash pattern" }));

	expect(onChange).toHaveBeenCalledTimes(1);
	const next = onChange.mock.calls[0]?.[0] as {
		dashArray: unknown[];
		lineCap: string;
	};
	expect(Array.isArray(next.dashArray)).toBe(true);
	expect(next.dashArray.length).toBeGreaterThan(0);
	expect(["round", "butt", "square"]).toContain(next.lineCap);
});

test("switching to named-style mode calls onChange with the solid keyword", () => {
	const onChange = vi.fn();
	render(
		<StrokeStyleEditor
			value={{ dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" }}
			onChange={onChange}
		/>,
	);

	fireEvent.click(screen.getByRole("radio", { name: "Named style" }));

	expect(onChange).toHaveBeenCalledWith("solid");
});

test("editing a dash segment's value calls onChange with the updated dashArray", () => {
	const onChange = vi.fn();
	render(
		<StrokeStyleEditor
			value={{ dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" }}
			onChange={onChange}
		/>,
	);

	fireEvent.change(screen.getByLabelText("Dash segment 1"), {
		target: { value: "8" },
	});

	expect(onChange).toHaveBeenCalledWith({
		dashArray: [{ value: 8, unit: "px" }],
		lineCap: "butt",
	});
});

test("editing a dash segment's unit calls onChange with the updated dashArray", () => {
	const onChange = vi.fn();
	render(
		<StrokeStyleEditor
			value={{ dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" }}
			onChange={onChange}
		/>,
	);

	fireEvent.change(screen.getByLabelText("Dash segment 1 unit"), {
		target: { value: "rem" },
	});

	expect(onChange).toHaveBeenCalledWith({
		dashArray: [{ value: 4, unit: "rem" }],
		lineCap: "butt",
	});
});

test("changing the line cap calls onChange with the updated lineCap", () => {
	const onChange = vi.fn();
	render(
		<StrokeStyleEditor
			value={{ dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" }}
			onChange={onChange}
		/>,
	);

	fireEvent.change(screen.getByLabelText("Line cap"), {
		target: { value: "square" },
	});

	expect(onChange).toHaveBeenCalledWith({
		dashArray: [{ value: 4, unit: "px" }],
		lineCap: "square",
	});
});

test("adding a segment calls onChange with an appended dash entry", () => {
	const onChange = vi.fn();
	render(
		<StrokeStyleEditor
			value={{ dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" }}
			onChange={onChange}
		/>,
	);

	fireEvent.click(screen.getByRole("button", { name: "Add segment" }));

	expect(onChange).toHaveBeenCalledWith({
		dashArray: [
			{ value: 4, unit: "px" },
			{ value: 4, unit: "px" },
		],
		lineCap: "butt",
	});
});

test("removing a segment calls onChange with that entry removed", () => {
	const onChange = vi.fn();
	render(
		<StrokeStyleEditor
			value={{
				dashArray: [
					{ value: 4, unit: "px" },
					{ value: 2, unit: "px" },
				],
				lineCap: "butt",
			}}
			onChange={onChange}
		/>,
	);

	fireEvent.click(
		screen.getByRole("button", { name: "Remove dash segment 1" }),
	);

	expect(onChange).toHaveBeenCalledWith({
		dashArray: [{ value: 2, unit: "px" }],
		lineCap: "butt",
	});
});

test("entering a non-numeric dash segment value does not call onChange", () => {
	const onChange = vi.fn();
	render(
		<StrokeStyleEditor
			value={{ dashArray: [{ value: 4, unit: "px" }], lineCap: "butt" }}
			onChange={onChange}
		/>,
	);

	fireEvent.change(screen.getByLabelText("Dash segment 1"), {
		target: { value: "abc" },
	});

	expect(onChange).not.toHaveBeenCalled();
});
