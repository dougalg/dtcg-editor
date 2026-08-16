import { consoleLogger } from "@dtcg-editor/errors";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import GlobalError from "./error.tsx";

afterEach(() => {
	vi.restoreAllMocks();
});

test("renders a generic fallback with an alert role (AC-07)", () => {
	vi.spyOn(consoleLogger, "error").mockImplementation(() => undefined);
	const error = Object.assign(new Error("boom"), { digest: "abc123" });

	render(<GlobalError error={error} reset={vi.fn()} />);

	expect(screen.getByRole("alert")).toBeTruthy();
	expect(screen.getByText("An unexpected error occurred.")).toBeTruthy();
});

test("clicking Try again calls reset (AC-07)", () => {
	vi.spyOn(consoleLogger, "error").mockImplementation(() => undefined);
	const error = new Error("boom");
	const reset = vi.fn();

	render(<GlobalError error={error} reset={reset} />);
	fireEvent.click(screen.getByRole("button", { name: /try again/i }));

	expect(reset).toHaveBeenCalledOnce();
});

test("logs the caught error via consoleLogger before rendering the fallback (AC-07)", () => {
	const logSpy = vi
		.spyOn(consoleLogger, "error")
		.mockImplementation(() => undefined);
	const error = Object.assign(new Error("boom"), { digest: "abc123" });

	render(<GlobalError error={error} reset={vi.fn()} />);

	expect(logSpy).toHaveBeenCalledOnce();
	expect(logSpy).toHaveBeenCalledWith(
		{ error, digest: "abc123" },
		"Unhandled error caught by root error boundary",
	);
});
