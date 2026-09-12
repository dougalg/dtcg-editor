import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DimensionPreview } from "./DimensionPreview.tsx";

test("renders px", () => {
	render(<DimensionPreview value={{ value: 16, unit: "px" }} />);
	expect(screen.getByText("16px")).toBeTruthy();
});

test("renders rem", () => {
	render(<DimensionPreview value={{ value: 1, unit: "rem" }} />);
	expect(screen.getByText("1rem")).toBeTruthy();
});

test("renders a fractional value", () => {
	render(<DimensionPreview value={{ value: 1.5, unit: "rem" }} />);
	expect(screen.getByText("1.5rem")).toBeTruthy();
});

test("declines to render for an invalid value", () => {
	const { container } = render(
		<DimensionPreview value={{ not: "a dimension" }} />,
	);
	expect(container.firstChild).toBeNull();
});
