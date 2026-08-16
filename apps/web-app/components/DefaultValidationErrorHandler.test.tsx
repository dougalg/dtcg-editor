import { TokenTypeValidationError } from "@dtcg-editor/token-editor-contract";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DefaultValidationErrorHandler } from "./DefaultValidationErrorHandler.tsx";

test("renders the error message as a role=alert line when error is passed", () => {
	const error = new TokenTypeValidationError("Invalid dimension value: bad", [
		{ path: [], message: "bad", code: "custom" },
	]);
	render(<DefaultValidationErrorHandler value={{ value: 4 }} error={error} />);
	expect(screen.getByRole("alert").textContent).toBe(
		"Invalid dimension value: bad",
	);
});

test("renders nothing when error is absent", () => {
	const { container } = render(
		<DefaultValidationErrorHandler value="anything" />,
	);
	expect(container.firstChild).toBeNull();
	expect(screen.queryByRole("alert")).toBeNull();
});
