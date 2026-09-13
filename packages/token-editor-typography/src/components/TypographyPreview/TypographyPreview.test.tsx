import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { TypographyPreview } from "./TypographyPreview.tsx";

const ZERO_SPACING_VALUE = {
	fontFamily: "Arial",
	fontSize: { value: 16, unit: "px" as const },
	fontWeight: 700,
	letterSpacing: { value: 0, unit: "px" as const },
	lineHeight: 1.4,
};

test("renders one line combining size, line height, family and weight, letter spacing omitted when zero", () => {
	render(<TypographyPreview value={ZERO_SPACING_VALUE} />);
	expect(screen.getByText("16px/1.4 Arial 700")).toBeTruthy();
});

test("includes letter spacing in that same line when it is non-zero", () => {
	render(
		<TypographyPreview
			value={{
				...ZERO_SPACING_VALUE,
				letterSpacing: { value: 1, unit: "px" as const },
			}}
		/>,
	);
	expect(screen.getByText("16px/1.4 Arial 700 +1px")).toBeTruthy();
});

test("matches DimensionPreview/FontFamilyPreview/FontWeightPreview's own formatting exactly", () => {
	render(
		<TypographyPreview
			value={{
				fontFamily: ["Helvetica", "Arial", "sans-serif"],
				fontSize: { value: 1, unit: "rem" as const },
				fontWeight: "bold" as const,
				letterSpacing: { value: 0, unit: "rem" as const },
				lineHeight: 1.2,
			}}
		/>,
	);
	expect(
		screen.getByText("1rem/1.2 Helvetica, Arial, sans-serif bold"),
	).toBeTruthy();
});

test("declines to render for a value that does not conform to the typography schema", () => {
	const { container } = render(
		<TypographyPreview value={{ fontFamily: "Arial" }} />,
	);
	expect(container.firstChild).toBeNull();
});
