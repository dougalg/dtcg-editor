import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "./Alert.tsx";

test("renders as a role=alert region with the alert data-slot", () => {
	render(<Alert>Something went wrong</Alert>);
	const alert = screen.getByRole("alert");
	expect(alert.dataset.slot).toBe("alert");
});

test("renders title and description as nested regions with their own data-slots", () => {
	render(
		<Alert>
			<AlertTitle>Save failed</AlertTitle>
			<AlertDescription>Check your connection and retry.</AlertDescription>
		</Alert>,
	);
	expect(screen.getByText("Save failed").dataset.slot).toBe("alert-title");
	expect(
		screen.getByText("Check your connection and retry.").dataset.slot,
	).toBe("alert-description");
});

test("forwards a custom className alongside the base alert class", () => {
	render(<Alert className="custom">Notice</Alert>);
	expect(screen.getByRole("alert").className).toContain("custom");
});
