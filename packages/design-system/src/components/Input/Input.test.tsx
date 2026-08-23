import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Input } from "./Input.tsx";

test("renders an input element with the input class and forwarded type", () => {
	render(<Input type="email" placeholder="you@example.com" />);
	const input = screen.getByPlaceholderText("you@example.com");
	expect(input.tagName).toBe("INPUT");
	expect((input as HTMLInputElement).type).toBe("email");
	expect(input.className).toContain("input");
});

test("merges a passed className with the base input class", () => {
	render(<Input placeholder="name" className="custom" />);
	const input = screen.getByPlaceholderText("name");
	expect(input.className).toContain("input");
	expect(input.className).toContain("custom");
});

test("updates its value as the user types", () => {
	render(<Input placeholder="name" />);
	const input = screen.getByPlaceholderText("name") as HTMLInputElement;
	fireEvent.change(input, { target: { value: "hello" } });
	expect(input.value).toBe("hello");
});

test("forwards disabled and other native input attributes", () => {
	render(<Input placeholder="name" disabled maxLength={5} />);
	const input = screen.getByPlaceholderText("name") as HTMLInputElement;
	expect(input.disabled).toBe(true);
	expect(input.maxLength).toBe(5);
});
