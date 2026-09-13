import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { FontFamilyEditor } from "./FontFamilyEditor.tsx";

test("renders an array value as one row per entry", () => {
	render(
		<FontFamilyEditor
			value={["Helvetica", "Arial", "sans-serif"]}
			onChange={vi.fn()}
		/>,
	);

	expect(screen.getByDisplayValue("Helvetica")).toBeTruthy();
	expect(screen.getByDisplayValue("Arial")).toBeTruthy();
	expect(screen.getByDisplayValue("sans-serif")).toBeTruthy();
});

test('"Add" appends a new entry to the array', () => {
	const onChange = vi.fn();
	render(<FontFamilyEditor value={["Helvetica"]} onChange={onChange} />);

	fireEvent.click(screen.getByRole("button", { name: "Add family" }));
	const inputs = screen.getAllByLabelText(/Family name/) as HTMLInputElement[];
	fireEvent.change(inputs[inputs.length - 1] as HTMLInputElement, {
		target: { value: "Arial" },
	});

	expect(onChange).toHaveBeenCalledWith(["Helvetica", "Arial"]);
});

test('"Remove" removes the targeted entry', () => {
	const onChange = vi.fn();
	render(
		<FontFamilyEditor
			value={["Helvetica", "Arial", "sans-serif"]}
			onChange={onChange}
		/>,
	);

	fireEvent.click(
		screen.getAllByRole("button", { name: "Remove" })[1] as HTMLElement,
	);

	expect(onChange).toHaveBeenCalledWith(["Helvetica", "sans-serif"]);
});

test("removing the last remaining entry yields an empty array", () => {
	const onChange = vi.fn();
	render(<FontFamilyEditor value={["Helvetica"]} onChange={onChange} />);

	fireEvent.click(screen.getByRole("button", { name: "Remove" }));

	expect(onChange).toHaveBeenCalledWith([]);
});

test('"move down" then "move up" reorder adjacent entries', () => {
	const onChange = vi.fn();
	render(
		<FontFamilyEditor value={["Helvetica", "Arial"]} onChange={onChange} />,
	);

	fireEvent.click(
		screen.getAllByRole("button", { name: "Move down" })[0] as HTMLElement,
	);
	expect(onChange).toHaveBeenCalledWith(["Arial", "Helvetica"]);
});

test('the first entry\'s "Move up" button is disabled', () => {
	render(
		<FontFamilyEditor value={["Helvetica", "Arial"]} onChange={vi.fn()} />,
	);

	const upButtons = screen.getAllByRole("button", { name: "Move up" });
	expect((upButtons[0] as HTMLButtonElement).disabled).toBe(true);
});

test('the last entry\'s "Move down" button is disabled', () => {
	render(
		<FontFamilyEditor value={["Helvetica", "Arial"]} onChange={vi.fn()} />,
	);

	const downButtons = screen.getAllByRole("button", { name: "Move down" });
	expect(
		(downButtons[downButtons.length - 1] as HTMLButtonElement).disabled,
	).toBe(true);
});

test("submitting a blank entry does not call onChange", () => {
	const onChange = vi.fn();
	render(<FontFamilyEditor value={["Helvetica"]} onChange={onChange} />);

	fireEvent.click(screen.getByRole("button", { name: "Add family" }));
	const inputs = screen.getAllByLabelText(/Family name/) as HTMLInputElement[];
	fireEvent.change(inputs[inputs.length - 1] as HTMLInputElement, {
		target: { value: "   " },
	});

	expect(onChange).not.toHaveBeenCalled();
});

test("a string value renders exactly one row showing that string", () => {
	render(<FontFamilyEditor value="Helvetica" onChange={vi.fn()} />);

	const inputs = screen.getAllByLabelText(/Family name/);
	expect(inputs).toHaveLength(1);
	expect(screen.getByDisplayValue("Helvetica")).toBeTruthy();
});

test("editing the sole entry of a string-sourced list calls onChange with a new string", () => {
	const onChange = vi.fn();
	render(<FontFamilyEditor value="Helvetica" onChange={onChange} />);

	fireEvent.change(screen.getByLabelText("Family name 1"), {
		target: { value: "Georgia" },
	});

	expect(onChange).toHaveBeenCalledWith("Georgia");
});

test("adding a second entry to a string-sourced single-item list produces an array", () => {
	const onChange = vi.fn();
	render(<FontFamilyEditor value="Helvetica" onChange={onChange} />);

	fireEvent.click(screen.getByRole("button", { name: "Add family" }));
	const inputs = screen.getAllByLabelText(/Family name/) as HTMLInputElement[];
	fireEvent.change(inputs[inputs.length - 1] as HTMLInputElement, {
		target: { value: "Arial" },
	});

	expect(onChange).toHaveBeenCalledWith(["Helvetica", "Arial"]);
});

test("removing back down to one entry from an array-sourced list calls onChange with a bare string", () => {
	const onChange = vi.fn();
	render(
		<FontFamilyEditor value={["Helvetica", "Arial"]} onChange={onChange} />,
	);

	fireEvent.click(
		screen.getAllByRole("button", { name: "Remove" })[1] as HTMLElement,
	);

	expect(onChange).toHaveBeenCalledWith("Helvetica");
});
