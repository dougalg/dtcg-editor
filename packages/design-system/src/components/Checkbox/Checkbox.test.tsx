import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Checkbox } from "./Checkbox.tsx";

test("renders unchecked by default with a checkbox role", () => {
	render(<Checkbox aria-label="Accept terms" />);
	const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
	expect(checkbox.dataset.state).toBe("unchecked");
	expect(checkbox.getAttribute("aria-checked")).toBe("false");
});

test("clicking toggles the checked state and data-state", () => {
	render(<Checkbox aria-label="Accept terms" />);
	const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
	fireEvent.click(checkbox);
	expect(checkbox.dataset.state).toBe("checked");
	expect(checkbox.getAttribute("aria-checked")).toBe("true");
	fireEvent.click(checkbox);
	expect(checkbox.dataset.state).toBe("unchecked");
	expect(checkbox.getAttribute("aria-checked")).toBe("false");
});

test("defaultChecked renders the check indicator immediately", () => {
	render(<Checkbox aria-label="Accept terms" defaultChecked />);
	const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
	expect(checkbox.dataset.state).toBe("checked");
	expect(checkbox.querySelector(".checkbox-indicator")).not.toBeNull();
});

test("disabled prevents toggling", () => {
	render(<Checkbox aria-label="Accept terms" disabled />);
	const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
	expect(checkbox.hasAttribute("disabled")).toBe(true);
	fireEvent.click(checkbox);
	expect(checkbox.dataset.state).toBe("unchecked");
});
