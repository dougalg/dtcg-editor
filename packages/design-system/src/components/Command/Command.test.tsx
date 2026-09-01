import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, expect, test } from "vitest";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "./Command.tsx";

beforeAll(() => {
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
});

test("renders the search input, the list, and one option per item", () => {
	render(
		<Command>
			<CommandInput placeholder="Search…" />
			<CommandList>
				<CommandItem>alpha</CommandItem>
				<CommandItem>beta</CommandItem>
			</CommandList>
		</Command>,
	);

	expect(screen.getByRole("combobox")).toBeTruthy();
	expect(screen.getByRole("listbox")).toBeTruthy();
	expect(screen.getAllByRole("option")).toHaveLength(2);
});

test("shows the empty-slot content when the query matches no item", () => {
	render(
		<Command>
			<CommandInput placeholder="Search…" />
			<CommandList>
				<CommandEmpty>No results</CommandEmpty>
				<CommandItem>alpha</CommandItem>
				<CommandItem>beta</CommandItem>
			</CommandList>
		</Command>,
	);

	fireEvent.change(screen.getByRole("combobox"), {
		target: { value: "zzz" },
	});

	expect(screen.getByText("No results")).toBeTruthy();
	expect(screen.queryAllByRole("option")).toHaveLength(0);
});
