import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "./Tabs.tsx";

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("has no WCAG 2.2 AA violations on the default active tab", async () => {
	const { container } = render(
		<Tabs defaultValue="details">
			<TabsList>
				<TabsTrigger value="details">Details</TabsTrigger>
				<TabsTrigger value="history">History</TabsTrigger>
			</TabsList>
			<TabsPanel value="details">Details content</TabsPanel>
			<TabsPanel value="history">History content</TabsPanel>
		</Tabs>,
	);
	await expectNoViolations(container);
});

test("has no WCAG 2.2 AA violations when a non-default tab is active", async () => {
	const { container } = render(
		<Tabs defaultValue="history">
			<TabsList>
				<TabsTrigger value="details">Details</TabsTrigger>
				<TabsTrigger value="history">History</TabsTrigger>
			</TabsList>
			<TabsPanel value="details">Details content</TabsPanel>
			<TabsPanel value="history">History content</TabsPanel>
		</Tabs>,
	);
	await expectNoViolations(container);
});
