import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "./Tabs.tsx";

function ExampleTabs(props: Partial<React.ComponentProps<typeof Tabs>> = {}) {
	return (
		<Tabs defaultValue="details" {...props}>
			<TabsList>
				<TabsTrigger value="details">Details</TabsTrigger>
				<TabsTrigger value="history">History</TabsTrigger>
			</TabsList>
			<TabsPanel value="details">Details content</TabsPanel>
			<TabsPanel value="history">History content</TabsPanel>
		</Tabs>
	);
}

test("renders only the active tab's panel", () => {
	render(<ExampleTabs />);
	expect(screen.getByText("Details content")).toBeTruthy();
	expect(screen.queryByText("History content")).toBeNull();
});

test("clicking a trigger switches the active tab and its panel", () => {
	render(<ExampleTabs />);
	fireEvent.mouseDown(screen.getByRole("tab", { name: "History" }));
	expect(screen.getByText("History content")).toBeTruthy();
	expect(screen.queryByText("Details content")).toBeNull();
});

test("calls onValueChange when the active tab changes", () => {
	const onValueChange = vi.fn();
	render(<ExampleTabs onValueChange={onValueChange} />);
	fireEvent.mouseDown(screen.getByRole("tab", { name: "History" }));
	expect(onValueChange).toHaveBeenCalledWith("history");
});
