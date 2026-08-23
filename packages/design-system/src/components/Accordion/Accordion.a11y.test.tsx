import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./Accordion.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations when collapsed", async () => {
	const { container } = render(
		<Accordion type="single" collapsible>
			<AccordionItem value="item-1">
				<AccordionTrigger>What is a design token?</AccordionTrigger>
				<AccordionContent>
					A named entity that stores a design decision.
				</AccordionContent>
			</AccordionItem>
		</Accordion>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations when an item is expanded", async () => {
	const { container } = render(
		<Accordion type="single" collapsible>
			<AccordionItem value="item-1">
				<AccordionTrigger>What is a design token?</AccordionTrigger>
				<AccordionContent>
					A named entity that stores a design decision.
				</AccordionContent>
			</AccordionItem>
		</Accordion>,
	);
	fireEvent.click(
		screen.getByRole("button", { name: "What is a design token?" }),
	);
	await expectNoViolations(container);
});
