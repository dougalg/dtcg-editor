import { parseTokenFile } from "@dtcg-editor/token-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { resetReferenceCatalogueCache } from "../../hooks/useReferenceCatalogue.ts";
import type { LoadedTokenFile } from "../../lib/tokens/load-directory.ts";
import { buildReferenceCatalogue } from "../../lib/tokens/reference-catalogue.ts";
import type { ReferenceCatalogue } from "../../lib/tokens/reference-catalogue-wire.ts";
import { buildReferenceIndex } from "../../lib/tokens/reference-index.ts";
import { TokenReferencePicker } from "./TokenReferencePicker.tsx";

beforeAll(() => {
	if (!window.ResizeObserver) {
		window.ResizeObserver = class {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
	}
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = () => false;
	}
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
});

afterEach(() => {
	resetReferenceCatalogueCache();
});

function file(relativePath: string, json: unknown): LoadedTokenFile {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) throw new Error(result.error.message);
	return { relativePath, document: result.value };
}

const CATALOGUE: ReferenceCatalogue = buildReferenceCatalogue(
	buildReferenceIndex([
		file("base.json", {
			color: {
				$type: "color",
				blue: { $value: { hex: "#0000ff" } },
				red: { $value: { hex: "#ff0000" } },
				accent: { $value: "{color.blue}" },
			},
		}),
	]),
);

function okFetch() {
	return vi
		.fn()
		.mockResolvedValue(
			new Response(JSON.stringify(CATALOGUE), { status: 200 }),
		);
}

function renderPicker(
	props: Partial<{
		editedTokenPath: readonly string[];
		currentReferenceValue: string;
		pendingReferenceValue: string | undefined;
		onStageEdit: (path: readonly string[], patch: { value: string }) => void;
		fetchImpl: typeof fetch;
	}> = {},
) {
	return render(
		<TokenReferencePicker
			editedTokenPath={props.editedTokenPath ?? ["color", "accent"]}
			currentReferenceValue={props.currentReferenceValue ?? "{color.blue}"}
			pendingReferenceValue={props.pendingReferenceValue}
			onStageEdit={props.onStageEdit ?? vi.fn()}
			fetchImpl={props.fetchImpl ?? okFetch()}
		/>,
	);
}

test("first open triggers the catalogue fetch and shows a loading state", async () => {
	// A fetch that never resolves keeps the picker in its loading state.
	const fetchImpl = vi.fn().mockReturnValue(new Promise<Response>(() => {}));
	renderPicker({ fetchImpl });

	expect(fetchImpl).not.toHaveBeenCalled();

	await act(async () => {
		fireEvent.click(
			screen.getByRole("combobox", {
				name: /repoint reference for color\.accent/i,
			}),
		);
	});

	expect(fetchImpl).toHaveBeenCalledTimes(1);
	expect(screen.getByText(/loading/i)).toBeTruthy();
});

async function openPicker(fetchImpl = okFetch(), extra = {}) {
	const onStageEdit = vi.fn();
	renderPicker({ fetchImpl, onStageEdit, ...extra });
	await act(async () => {
		fireEvent.click(
			screen.getByRole("combobox", { name: /repoint reference for/i }),
		);
		await Promise.resolve();
	});
	return { onStageEdit };
}

test("the trigger and the search field both name the token being repointed", async () => {
	await openPicker();

	const named = screen
		.getAllByRole("combobox")
		.map((el) => el.getAttribute("aria-label"));
	expect(named).toContain("Repoint reference for color.accent");
	expect(named).toContain("Search tokens to repoint color.accent");
});

test("typing narrows the list through filterCandidates, in order", async () => {
	await openPicker();

	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "color.re" },
	});

	// Options now also carry their resolved-value preview (FR-009) in their
	// visible text, so narrowing/order is asserted on the accessible name
	// (the bare displayPath — see TokenReferencePicker.tsx's aria-hidden
	// preview span) rather than full textContent.
	expect(screen.getAllByRole("option")).toHaveLength(1);
	expect(screen.getByRole("option", { name: "color.red" })).toBeDefined();
});

test("a query matching nothing shows 'No tokens found' and nothing is selectable", async () => {
	await openPicker();

	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "zzz-nope" },
	});

	expect(screen.getByText(/no tokens found/i)).toBeTruthy();
	expect(screen.queryAllByRole("option")).toHaveLength(0);
});

test("selecting a candidate stages the alias edit and closes the popover", async () => {
	const { onStageEdit } = await openPicker();

	fireEvent.click(screen.getByRole("option", { name: "color.red" }));

	expect(onStageEdit).toHaveBeenCalledWith(["color", "accent"], {
		value: "{color.red}",
	});
	expect(
		screen
			.getByRole("combobox", { name: /repoint reference for/i })
			.getAttribute("aria-expanded"),
	).toBe("false");
});

test("selecting the current target stages nothing but still closes", async () => {
	const onStageEdit = vi.fn();
	renderPicker({
		fetchImpl: okFetch(),
		onStageEdit,
		currentReferenceValue: "{color.blue}",
	});
	await act(async () => {
		fireEvent.click(
			screen.getByRole("combobox", { name: /repoint reference for/i }),
		);
		await Promise.resolve();
	});

	fireEvent.click(screen.getByRole("option", { name: "color.blue" }));

	expect(onStageEdit).not.toHaveBeenCalled();
});

test("re-opening marks the current target as the selected row", async () => {
	renderPicker({ fetchImpl: okFetch(), currentReferenceValue: "{color.blue}" });
	await act(async () => {
		fireEvent.click(
			screen.getByRole("combobox", { name: /repoint reference for/i }),
		);
		await Promise.resolve();
	});

	expect(
		screen
			.getByRole("option", { name: "color.blue" })
			.getAttribute("aria-current"),
	).toBe("true");
	expect(
		screen
			.getByRole("option", { name: "color.red" })
			.getAttribute("aria-current"),
	).toBeNull();
});

test("when the catalogue fetch errors, a raw-text input stages edits", async () => {
	const onStageEdit = vi.fn();
	const fetchImpl = vi.fn().mockRejectedValue(new Error("boom"));
	renderPicker({
		fetchImpl,
		onStageEdit,
		currentReferenceValue: "{color.blue}",
	});

	await act(async () => {
		fireEvent.click(
			screen.getByRole("combobox", { name: /repoint reference for/i }),
		);
		await Promise.resolve();
		await Promise.resolve();
	});

	const raw = screen.getByRole("textbox", { name: /reference/i });
	expect((raw as HTMLInputElement).value).toBe("{color.blue}");

	fireEvent.change(raw, { target: { value: "{color.red}" } });
	expect(onStageEdit).toHaveBeenCalledWith(["color", "accent"], {
		value: "{color.red}",
	});
});

test("a circular candidate row is disabled — selecting it stages nothing and the popover stays open", async () => {
	// The edited token is color.accent; color.accent itself is a self-reference.
	const { onStageEdit } = await openPicker();

	const selfRow = screen.getByRole("option", { name: /color\.accent/ });
	expect(selfRow.getAttribute("aria-disabled")).toBe("true");

	fireEvent.click(selfRow);
	expect(onStageEdit).not.toHaveBeenCalled();
	expect(
		screen
			.getByRole("combobox", { name: /repoint reference for/i })
			.getAttribute("aria-expanded"),
	).toBe("true");
});

test("a candidate resolving to a missing path stays enabled and can be staged", async () => {
	const brokenFetch = vi.fn().mockResolvedValue(
		new Response(
			JSON.stringify(
				buildReferenceCatalogue(
					buildReferenceIndex([
						file("base.json", {
							color: { $type: "color", accent: { $value: "{color.blue}" } },
							broken: { $type: "color", $value: "{color.ghost}" },
						}),
					]),
				),
			),
			{ status: 200 },
		),
	);
	const { onStageEdit } = await openPicker(brokenFetch);

	const brokenRow = screen.getByRole("option", { name: /^broken/ });
	expect(brokenRow.getAttribute("aria-disabled")).not.toBe("true");

	fireEvent.click(brokenRow);
	expect(onStageEdit).toHaveBeenCalledWith(["color", "accent"], {
		value: "{broken}",
	});
});

test("an aria-live region announces the current result count", async () => {
	await openPicker();

	const live = () =>
		screen.getByRole("status", { name: "Search results" }).textContent;
	expect(live()).toMatch(/3\b/);

	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "color.re" },
	});
	expect(live()).toMatch(/\b1\b/);

	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "zzz-nope" },
	});
	expect(live()).toMatch(/no match/i);
});
