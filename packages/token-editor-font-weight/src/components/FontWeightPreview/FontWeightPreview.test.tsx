import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FontWeightPreview } from "./FontWeightPreview.tsx";

test("renders a numeric value as text", () => {
	render(<FontWeightPreview value={700} />);
	expect(screen.getByText("700")).toBeTruthy();
});

test("renders an alias value as text", () => {
	render(<FontWeightPreview value="bold" />);
	expect(screen.getByText("bold")).toBeTruthy();
});

test("declines to render for a value that fails schema validation", () => {
	const { container } = render(<FontWeightPreview value={{ not: "valid" }} />);
	expect(container.firstChild).toBeNull();
});
