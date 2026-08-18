import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { TokenFileSummary } from "../../lib/tokens/scan.ts";
import { FolderOverview } from "./FolderOverview.tsx";

afterEach(() => {
	cleanup();
});

test("shows only the valid badge for a valid, standard file", () => {
	const files: readonly TokenFileSummary[] = [
		{ relativePath: "good.json", valid: true, standard: true },
	];
	render(<FolderOverview files={files} />);

	expect(screen.getByText("valid")).toBeTruthy();
	expect(screen.queryByText("non-standard")).toBeNull();
});

test("shows both the valid and non-standard badges for a valid file with an unrecognized $type (AC-02)", () => {
	const files: readonly TokenFileSummary[] = [
		{ relativePath: "weird.json", valid: true, standard: false },
	];
	render(<FolderOverview files={files} />);

	expect(screen.getByText("valid")).toBeTruthy();
	expect(screen.getByText("non-standard")).toBeTruthy();
});

test("an invalid file's rendering is unaffected by the standard/non-standard distinction", () => {
	const files: readonly TokenFileSummary[] = [
		{ relativePath: "bad.json", valid: false, error: "Invalid JSON" },
	];
	render(<FolderOverview files={files} />);

	expect(screen.getByText("invalid")).toBeTruthy();
	expect(screen.queryByText("non-standard")).toBeNull();
	expect(screen.queryByText("valid")).toBeNull();
});
