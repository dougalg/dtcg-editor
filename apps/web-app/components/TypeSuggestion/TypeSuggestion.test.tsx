import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { TypeSuggestion } from "./TypeSuggestion.tsx";

test("shows the suggested type", () => {
	render(<TypeSuggestion inferredType="color" onAccept={() => {}} />);
	expect(screen.getByText(/Suggested type: color/)).toBeTruthy();
});

test("calls onAccept with the inferred type when the accept button is clicked", () => {
	const onAccept = vi.fn();
	render(<TypeSuggestion inferredType="dimension" onAccept={onAccept} />);
	fireEvent.click(screen.getByRole("button", { name: "Use this type" }));
	expect(onAccept).toHaveBeenCalledExactlyOnceWith("dimension");
});
