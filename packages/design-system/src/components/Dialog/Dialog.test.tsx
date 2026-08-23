import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "./Dialog.tsx";

function renderDialog() {
	return render(
		<Dialog>
			<DialogTrigger>Open</DialogTrigger>
			<DialogContent>
				<DialogTitle>Confirm</DialogTitle>
				<DialogDescription>Are you sure?</DialogDescription>
				<DialogClose>Close</DialogClose>
			</DialogContent>
		</Dialog>,
	);
}

test("content is not rendered until the trigger opens it", () => {
	renderDialog();
	expect(screen.queryByText("Are you sure?")).toBeNull();

	fireEvent.click(screen.getByText("Open"));
	expect(screen.getByText("Are you sure?")).not.toBeNull();
});

test("DialogClose closes the dialog", () => {
	renderDialog();
	fireEvent.click(screen.getByText("Open"));
	expect(screen.getByText("Are you sure?")).not.toBeNull();

	fireEvent.click(screen.getByText("Close"));
	expect(screen.queryByText("Are you sure?")).toBeNull();
});

test("defaultOpen renders the dialog role with its title as the accessible name", () => {
	render(
		<Dialog defaultOpen>
			<DialogContent>
				<DialogTitle>Confirm</DialogTitle>
				<DialogDescription>Are you sure?</DialogDescription>
			</DialogContent>
		</Dialog>,
	);
	const dialog = screen.getByRole("dialog");
	expect(dialog).not.toBeNull();
	expect(dialog.getAttribute("aria-labelledby")).not.toBeNull();
});
