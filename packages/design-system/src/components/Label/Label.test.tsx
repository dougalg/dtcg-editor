import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Label } from "./Label.tsx";

test("renders its children as a label element with the label class", () => {
	render(<Label htmlFor="name">Name</Label>);
	const label = screen.getByText("Name");
	expect(label.tagName).toBe("LABEL");
	expect(label.className).toContain("label");
});

test("associates with a form control via htmlFor", () => {
	render(
		<>
			<Label htmlFor="name">Name</Label>
			<input id="name" />
		</>,
	);
	const input = screen.getByLabelText("Name");
	expect(input.tagName).toBe("INPUT");
});

test("merges a passed className with the base label class", () => {
	render(
		<Label htmlFor="name" className="custom">
			Name
		</Label>,
	);
	const label = screen.getByText("Name");
	expect(label.className).toContain("label");
	expect(label.className).toContain("custom");
});
