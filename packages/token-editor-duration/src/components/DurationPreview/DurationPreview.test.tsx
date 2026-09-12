import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DurationPreview } from "./DurationPreview.tsx";

test("renders ms", () => {
	render(<DurationPreview value={{ value: 200, unit: "ms" }} />);
	expect(screen.getByText("200ms")).toBeTruthy();
});

test("renders s", () => {
	render(<DurationPreview value={{ value: 1, unit: "s" }} />);
	expect(screen.getByText("1s")).toBeTruthy();
});

test("renders a fractional value", () => {
	render(<DurationPreview value={{ value: 1.5, unit: "s" }} />);
	expect(screen.getByText("1.5s")).toBeTruthy();
});

test("declines to render for an invalid value", () => {
	const { container } = render(
		<DurationPreview value={{ not: "a duration" }} />,
	);
	expect(container.firstChild).toBeNull();
});
