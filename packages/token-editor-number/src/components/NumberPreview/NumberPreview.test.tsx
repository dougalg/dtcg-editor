import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { NumberPreview } from "./NumberPreview.tsx";

test("renders a numeric value", () => {
	render(<NumberPreview value={1.5} />);
	expect(screen.getByText("1.5")).toBeTruthy();
});

test("renders a negative value", () => {
	render(<NumberPreview value={-2} />);
	expect(screen.getByText("-2")).toBeTruthy();
});

test("declines to render for a value that fails schema validation", () => {
	const { container } = render(<NumberPreview value={{ not: "valid" }} />);
	expect(container.firstChild).toBeNull();
});
