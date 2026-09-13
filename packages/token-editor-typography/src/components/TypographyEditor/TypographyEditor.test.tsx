import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { TypographyEditor } from "./TypographyEditor.tsx";

const VALUE = {
	fontFamily: "Arial",
	fontSize: { value: 16, unit: "px" as const },
	fontWeight: 700,
	letterSpacing: { value: 0, unit: "px" as const },
	lineHeight: 1.4,
};

test("renders labeled controls for all five fields showing the current value", () => {
	render(<TypographyEditor value={VALUE} onChange={vi.fn()} />);

	const fontFamilyGroup = screen.getByRole("group", { name: "Font Family" });
	expect(
		(
			within(fontFamilyGroup).getByLabelText(
				"Family name 1",
			) as HTMLInputElement
		).value,
	).toBe("Arial");

	const fontSizeGroup = screen.getByRole("group", { name: "Font Size" });
	expect(
		(within(fontSizeGroup).getByLabelText("Value") as HTMLInputElement).value,
	).toBe("16");
	expect(
		(within(fontSizeGroup).getByLabelText("Unit") as HTMLSelectElement).value,
	).toBe("px");

	const fontWeightGroup = screen.getByRole("group", { name: "Font Weight" });
	expect(
		(within(fontWeightGroup).getByLabelText("Value") as HTMLInputElement).value,
	).toBe("700");

	const letterSpacingGroup = screen.getByRole("group", {
		name: "Letter Spacing",
	});
	expect(
		(within(letterSpacingGroup).getByLabelText("Value") as HTMLInputElement)
			.value,
	).toBe("0");
	expect(
		(within(letterSpacingGroup).getByLabelText("Unit") as HTMLSelectElement)
			.value,
	).toBe("px");

	const lineHeightGroup = screen.getByRole("group", { name: "Line Height" });
	expect(
		(within(lineHeightGroup).getByLabelText("Value") as HTMLInputElement).value,
	).toBe("1.4");
});

test("changing the font family control updates only fontFamily", () => {
	const onChange = vi.fn();
	render(<TypographyEditor value={VALUE} onChange={onChange} />);

	const fontFamilyGroup = screen.getByRole("group", { name: "Font Family" });
	fireEvent.change(within(fontFamilyGroup).getByLabelText("Family name 1"), {
		target: { value: "Helvetica" },
	});

	expect(onChange).toHaveBeenCalledWith({
		...VALUE,
		fontFamily: "Helvetica",
	});
});

test("changing the font size control updates only fontSize", () => {
	const onChange = vi.fn();
	render(<TypographyEditor value={VALUE} onChange={onChange} />);

	const fontSizeGroup = screen.getByRole("group", { name: "Font Size" });
	fireEvent.change(within(fontSizeGroup).getByLabelText("Value"), {
		target: { value: "20" },
	});

	expect(onChange).toHaveBeenCalledWith({
		...VALUE,
		fontSize: { value: 20, unit: "px" },
	});
});

test("changing the font weight control updates only fontWeight", () => {
	const onChange = vi.fn();
	render(<TypographyEditor value={VALUE} onChange={onChange} />);

	const fontWeightGroup = screen.getByRole("group", { name: "Font Weight" });
	fireEvent.change(within(fontWeightGroup).getByLabelText("Value"), {
		target: { value: "400" },
	});

	expect(onChange).toHaveBeenCalledWith({
		...VALUE,
		fontWeight: 400,
	});
});

test("changing the letter spacing control updates only letterSpacing", () => {
	const onChange = vi.fn();
	render(<TypographyEditor value={VALUE} onChange={onChange} />);

	const letterSpacingGroup = screen.getByRole("group", {
		name: "Letter Spacing",
	});
	fireEvent.change(within(letterSpacingGroup).getByLabelText("Unit"), {
		target: { value: "rem" },
	});

	expect(onChange).toHaveBeenCalledWith({
		...VALUE,
		letterSpacing: { value: 0, unit: "rem" },
	});
});

test("changing the line height control updates only lineHeight", () => {
	const onChange = vi.fn();
	render(<TypographyEditor value={VALUE} onChange={onChange} />);

	const lineHeightGroup = screen.getByRole("group", { name: "Line Height" });
	fireEvent.change(within(lineHeightGroup).getByLabelText("Value"), {
		target: { value: "1.5" },
	});

	expect(onChange).toHaveBeenCalledWith({
		...VALUE,
		lineHeight: 1.5,
	});
});

test("the Font Size and Letter Spacing controls are not confused with one another", () => {
	// Distinct fontSize/letterSpacing values: if the two DimensionEditor
	// instances were accidentally wired to the same field, or swapped, this
	// would fail.
	render(<TypographyEditor value={VALUE} onChange={vi.fn()} />);

	const fontSizeGroup = screen.getByRole("group", { name: "Font Size" });
	const letterSpacingGroup = screen.getByRole("group", {
		name: "Letter Spacing",
	});

	expect(
		(within(fontSizeGroup).getByLabelText("Value") as HTMLInputElement).value,
	).toBe("16");
	expect(
		(within(letterSpacingGroup).getByLabelText("Value") as HTMLInputElement)
			.value,
	).toBe("0");
});
