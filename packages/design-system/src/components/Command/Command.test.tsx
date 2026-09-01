import { render, screen } from "@testing-library/react";
import { beforeAll, expect, test } from "vitest";
import { Command, CommandInput, CommandItem, CommandList } from "./Command.tsx";

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
