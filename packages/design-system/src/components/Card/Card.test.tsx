import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardMedia,
	CardTitle,
} from "./Card.tsx";

test("renders every sub-region with its own class and content", () => {
	render(
		<Card data-testid="card">
			<CardHeader>
				<CardTitle>Token set</CardTitle>
				<CardDescription>All color tokens</CardDescription>
				<CardAction>Edit</CardAction>
			</CardHeader>
			<CardMedia>preview</CardMedia>
			<CardContent>12 tokens</CardContent>
			<CardFooter>Updated today</CardFooter>
		</Card>,
	);
	expect(screen.getByTestId("card").className).toContain("card");
	expect(screen.getByText("Token set").className).toContain("card-title");
	expect(screen.getByText("All color tokens").className).toContain(
		"card-description",
	);
	expect(screen.getByText("Edit").className).toContain("card-action");
	expect(screen.getByText("preview").className).toContain("card-media");
	expect(screen.getByText("12 tokens").className).toContain("card-content");
	expect(screen.getByText("Updated today").className).toContain("card-footer");
});

test("forwards a custom className alongside the base card class", () => {
	render(<Card className="custom" data-testid="card" />);
	expect(screen.getByTestId("card").className).toContain("custom");
	expect(screen.getByTestId("card").className).toContain("card");
});
