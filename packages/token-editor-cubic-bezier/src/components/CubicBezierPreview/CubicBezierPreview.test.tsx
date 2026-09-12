import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { CubicBezierPreview } from "./CubicBezierPreview.tsx";

test("renders a cubic-bezier(...) string for a valid value", () => {
	render(<CubicBezierPreview value={[0.4, 0, 0.2, 1]} />);
	expect(screen.getByText("cubic-bezier(0.4, 0, 0.2, 1)")).toBeTruthy();
});

test("renders text for an out-of-range-y value", () => {
	render(<CubicBezierPreview value={[0.68, -0.55, 0.27, 1.55]} />);
	expect(
		screen.getByText("cubic-bezier(0.68, -0.55, 0.27, 1.55)"),
	).toBeTruthy();
});

test("renders nothing for a short array", () => {
	const { container } = render(<CubicBezierPreview value={[0.4, 0, 0.2]} />);
	expect(container.firstChild).toBeNull();
});

test("renders nothing for a non-array value", () => {
	const { container } = render(
		<CubicBezierPreview value={{ not: "a cubicBezier" }} />,
	);
	expect(container.firstChild).toBeNull();
});
