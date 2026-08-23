import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { ReferencingToken } from "../../lib/tokens/reference-index.ts";
import { ReferencedByBadge } from "./ReferencedByBadge.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

function referrer(path: readonly string[], file: string): ReferencingToken {
	return { path, file };
}

test("has no WCAG 2.2 AA violations with the popover closed", async () => {
	const { container } = render(
		<ReferencedByBadge
			referencedBy={[referrer(["a"], "semantic.json")]}
			currentFile="semantic.json"
		/>,
	);
	await expectNoViolations(container);
});

test("the trigger exposes the referrer count as its accessible name", () => {
	render(
		<ReferencedByBadge
			referencedBy={[
				referrer(["a"], "semantic.json"),
				referrer(["b"], "semantic.json"),
			]}
			currentFile="semantic.json"
		/>,
	);
	const trigger = screen.getByRole("button", { name: "referenced twice" });
	expect(trigger).toBeTruthy();
});

test("the trigger reflects its expanded state via aria-expanded", () => {
	render(
		<ReferencedByBadge
			referencedBy={[referrer(["a"], "semantic.json")]}
			currentFile="semantic.json"
		/>,
	);
	const trigger = screen.getByRole("button", { name: "referenced once" });
	expect(trigger.getAttribute("aria-expanded")).toBe("false");
	fireEvent.click(trigger);
	expect(trigger.getAttribute("aria-expanded")).toBe("true");
});

test("each referrer link is reachable and keyboard-operable once opened", () => {
	render(
		<ReferencedByBadge
			referencedBy={[
				referrer(["a"], "semantic.json"),
				referrer(["b"], "semantic.json"),
			]}
			currentFile="semantic.json"
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: "referenced twice" }));

	const links = screen.getAllByRole("link");
	expect(links).toHaveLength(2);
	for (const link of links) {
		expect(link.tabIndex).not.toBe(-1);
	}
});
