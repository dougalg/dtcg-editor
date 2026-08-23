import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./Accordion.tsx";

function renderAccordion() {
	return render(
		<Accordion type="single" collapsible>
			<AccordionItem value="item-1">
				<AccordionTrigger>What is a design token?</AccordionTrigger>
				<AccordionContent>
					A named entity that stores a design decision.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="item-2">
				<AccordionTrigger>What is DTCG?</AccordionTrigger>
				<AccordionContent>The Design Tokens Community Group.</AccordionContent>
			</AccordionItem>
		</Accordion>,
	);
}

test("renders each trigger collapsed by default", () => {
	renderAccordion();
	const trigger = screen.getByRole("button", {
		name: "What is a design token?",
	});
	expect(trigger.getAttribute("aria-expanded")).toBe("false");
	expect(trigger.dataset.state).toBe("closed");
});

test("clicking a trigger expands its content and updates aria-expanded", () => {
	renderAccordion();
	const trigger = screen.getByRole("button", {
		name: "What is a design token?",
	});
	fireEvent.click(trigger);
	expect(trigger.getAttribute("aria-expanded")).toBe("true");
	expect(trigger.dataset.state).toBe("open");
	const content = screen.getByText(
		"A named entity that stores a design decision.",
	);
	expect(content).not.toBeNull();
});

test("type=single collapsible closes an open item when its trigger is clicked again", () => {
	renderAccordion();
	const trigger = screen.getByRole("button", {
		name: "What is a design token?",
	});
	fireEvent.click(trigger);
	expect(trigger.dataset.state).toBe("open");
	fireEvent.click(trigger);
	expect(trigger.dataset.state).toBe("closed");
	expect(trigger.getAttribute("aria-expanded")).toBe("false");
});

test("type=single only keeps one item open at a time", () => {
	renderAccordion();
	const first = screen.getByRole("button", { name: "What is a design token?" });
	const second = screen.getByRole("button", { name: "What is DTCG?" });
	fireEvent.click(first);
	fireEvent.click(second);
	expect(first.dataset.state).toBe("closed");
	expect(second.dataset.state).toBe("open");
});
