import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../../vitest-a11y-tags.ts";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./Card.tsx";

test("has no WCAG 2.2 AA violations", async () => {
	const { container } = render(
		<Card>
			<CardHeader>
				<CardTitle>Token set</CardTitle>
				<CardDescription>All color tokens</CardDescription>
			</CardHeader>
			<CardContent>12 tokens</CardContent>
			<CardFooter>Updated today</CardFooter>
		</Card>,
	);
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
});
