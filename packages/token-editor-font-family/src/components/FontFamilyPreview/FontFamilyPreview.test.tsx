import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FontFamilyPreview } from "./FontFamilyPreview.tsx";

test("renders a string value as itself", () => {
	render(<FontFamilyPreview value="Helvetica" />);
	expect(screen.getByText("Helvetica")).toBeTruthy();
});

test("renders a short array comma-joined", () => {
	render(<FontFamilyPreview value={["Arial", "sans-serif"]} />);
	expect(screen.getByText("Arial, sans-serif")).toBeTruthy();
});

test('truncates a long list to the first 3 entries plus "+N more"', () => {
	render(
		<FontFamilyPreview
			value={["Helvetica", "Arial", "Verdana", "Tahoma", "sans-serif"]}
		/>,
	);
	expect(screen.getByText("Helvetica, Arial, Verdana, +2 more")).toBeTruthy();
});

test("renders empty text for an empty array without throwing", () => {
	const { container } = render(<FontFamilyPreview value={[]} />);
	expect(container.textContent).toBe("");
});

test("declines to render for a value that fails schema validation", () => {
	const { container } = render(<FontFamilyPreview value={{ not: "valid" }} />);
	expect(container.firstChild).toBeNull();
});

test("declines to render for an array containing a non-string element", () => {
	const { container } = render(<FontFamilyPreview value={["Helvetica", 42]} />);
	expect(container.firstChild).toBeNull();
});
