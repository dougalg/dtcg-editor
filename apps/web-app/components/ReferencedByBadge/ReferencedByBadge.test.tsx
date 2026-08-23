import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { ReferencingToken } from "../../lib/tokens/reference-index.ts";
import { ReferencedByBadge } from "./ReferencedByBadge.tsx";

// No manual DOM cleanup here: vitest.setup.ts already registers a global
// `cleanup()` afterEach, and Radix's Popover renders its content into a
// portal appended directly to `document.body` — a blunt
// `document.body.innerHTML = ""` races that portal's own React-managed
// unmount and throws "node to be removed is not a child of this node".

function referrer(path: readonly string[], file: string): ReferencingToken {
	return { path, file };
}

test("renders nothing at all when there are no referrers", () => {
	const { container } = render(
		<ReferencedByBadge referencedBy={[]} currentFile="semantic.json" />,
	);
	expect(container.innerHTML).toBe("");
});

test("reads 'referenced once' for exactly one referrer", () => {
	render(
		<ReferencedByBadge
			referencedBy={[referrer(["color", "action", "hover"], "semantic.json")]}
			currentFile="semantic.json"
		/>,
	);
	expect(screen.getByText("referenced once")).toBeTruthy();
});

test("reads 'referenced twice' for exactly two referrers", () => {
	render(
		<ReferencedByBadge
			referencedBy={[
				referrer(["a"], "semantic.json"),
				referrer(["b"], "semantic.json"),
			]}
			currentFile="semantic.json"
		/>,
	);
	expect(screen.getByText("referenced twice")).toBeTruthy();
});

test("reads 'referenced N times' for three or more referrers", () => {
	render(
		<ReferencedByBadge
			referencedBy={[
				referrer(["a"], "semantic.json"),
				referrer(["b"], "semantic.json"),
				referrer(["c"], "semantic.json"),
			]}
			currentFile="semantic.json"
		/>,
	);
	expect(screen.getByText("referenced 3 times")).toBeTruthy();
});

test("opening the popover lists every referrer, reachable by a link", () => {
	render(
		<ReferencedByBadge
			referencedBy={[
				referrer(["color", "action", "hover"], "semantic.json"),
				referrer(["color", "action", "default"], "semantic.json"),
			]}
			currentFile="semantic.json"
		/>,
	);
	fireEvent.click(screen.getByText("referenced twice"));

	const links = screen.getAllByRole("link");
	expect(links).toHaveLength(2);
	expect(
		screen
			.getByRole("link", { name: "Go to color.action.hover" })
			.getAttribute("href"),
	).toBe("/tokens/semantic.json#color.action.hover");
	expect(
		screen
			.getByRole("link", { name: "Go to color.action.default" })
			.getAttribute("href"),
	).toBe("/tokens/semantic.json#color.action.default");
});

test("a cross-file referrer is labelled by its file; a same-file one is not", () => {
	render(
		<ReferencedByBadge
			referencedBy={[
				referrer(["color", "brand", "blue"], "base.json"),
				referrer(["color", "text", "primary"], "semantic.json"),
			]}
			currentFile="semantic.json"
		/>,
	);
	fireEvent.click(screen.getByText("referenced twice"));

	expect(screen.getByText("base.json: color.brand.blue")).toBeTruthy();
	expect(screen.getByText("color.text.primary")).toBeTruthy();
	expect(screen.queryByText("semantic.json: color.text.primary")).toBeNull();
});

test("expands on trigger click and collapses on a second click", () => {
	render(
		<ReferencedByBadge
			referencedBy={[referrer(["a"], "semantic.json")]}
			currentFile="semantic.json"
		/>,
	);
	const trigger = screen.getByText("referenced once");

	expect(screen.queryByRole("link")).toBeNull();
	fireEvent.click(trigger);
	expect(screen.getByRole("link")).toBeTruthy();
	fireEvent.click(trigger);
	expect(screen.queryByRole("link")).toBeNull();
});
