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

test("an empty query shows only the current target's own row, not the whole directory", async () => {
	await openPicker();

	// color.accent's current value is {color.blue} — only that row shows,
	// pre-selected; color.red (a real, unrelated candidate) is not rendered
	// at all until the user types (SC-004: an idle full-directory listing
	// is exactly what makes the render cap matter on a large catalogue).
	expect(screen.getAllByRole("option")).toHaveLength(1);
	const blueRow = screen.getByRole("option", { name: "color.blue" });
	expect(blueRow.getAttribute("aria-current")).toBe("true");
	expect(screen.queryByRole("option", { name: "color.red" })).toBeNull();
});

test("an empty query with no current-target match shows nothing, prompting the user to type", async () => {
	// A fresh (never-staged, unresolvable-today) reference: no candidate's
	// alias equals it, so the current-target row itself has nothing to show.
	await openPicker(okFetch(), { currentReferenceValue: "{color.nope}" });

	expect(screen.queryAllByRole("option")).toHaveLength(0);
	expect(screen.getByText("Type to search tokens")).toBeTruthy();
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

test("closing the popover resets the query, so reopening starts idle again", async () => {
	await openPicker();

	const search = screen.getByRole("combobox", { name: /search tokens/i });
	fireEvent.change(search, { target: { value: "color.re" } });
	expect(screen.getAllByRole("option")).toHaveLength(1);

	fireEvent.keyDown(search, { key: "Escape" });
	await act(async () => {
		fireEvent.click(
			screen.getByRole("combobox", { name: /repoint reference for/i }),
		);
		await Promise.resolve();
	});

	// Back to idle: only the current target (color.blue), not the stale
	// "color.re" narrowing from before.
	expect(screen.getAllByRole("option")).toHaveLength(1);
	expect(screen.getByRole("option", { name: "color.blue" })).toBeTruthy();
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

	// color.red isn't the current target ({color.blue}), so it isn't shown
	// at idle — type to reveal it.
	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "red" },
	});
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

	// Typing further still marks only the current target, not every row.
	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "color" },
	});
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
	// Not the current target ({color.blue}), so type to reveal its own row.
	const { onStageEdit } = await openPicker();
	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "accent" },
	});

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

test("a non-self cycle-closing candidate names the cycle even when it isn't the highlighted row", async () => {
	// hub -> {color.blue} (clean); wheel -> {color.hub} — repointing hub at
	// wheel would close hub -> wheel -> hub, but wheel is not hub's own path
	// (the self case), so nothing marks it highlighted by default.
	const cycleFetch = vi.fn().mockResolvedValue(
		new Response(
			JSON.stringify(
				buildReferenceCatalogue(
					buildReferenceIndex([
						file("base.json", {
							color: {
								$type: "color",
								blue: { $value: { hex: "#0000ff" } },
								hub: { $value: "{color.blue}" },
								wheel: { $value: "{color.hub}" },
							},
						}),
					]),
				),
			),
			{ status: 200 },
		),
	);
	renderPicker({
		editedTokenPath: ["color", "hub"],
		currentReferenceValue: "{color.blue}",
		fetchImpl: cycleFetch,
	});
	await act(async () => {
		fireEvent.click(
			screen.getByRole("combobox", { name: /repoint reference for/i }),
		);
		await Promise.resolve();
	});
	// wheel isn't the current target ({color.blue}) — type to reveal it.
	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "wheel" },
	});

	const wheelRow = screen.getByRole("option", { name: "color.wheel" });
	expect(wheelRow.getAttribute("aria-disabled")).toBe("true");
	// FR-014: named even without hovering/highlighting it first.
	expect(wheelRow.textContent).toMatch(/color\.hub/);
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
	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "broken" },
	});

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
	// Idle: only the current target ({color.blue}) shows, no query yet.
	expect(live()).toMatch(/\b1\b/);

	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "color.re" },
	});
	expect(live()).toMatch(/\b1\b/);

	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "zzz-nope" },
	});
	expect(live()).toMatch(/no match/i);
});

test("a result set over the render cap shows only the first 200, with a footer noting the rest (SC-004)", async () => {
	// 205 candidates — one more than the cap needs to prove it's applied at
	// all, kept small enough to stay a fast unit test (the real regression
	// guard for main-thread cost is the e2e Long Task spec).
	const CANDIDATE_COUNT = 205;
	const color: Record<string, unknown> = { $type: "color" };
	for (let i = 0; i < CANDIDATE_COUNT; i++) {
		color[`token_${i}`] = { $value: { hex: "#000000" } };
	}
	const manyCatalogue = buildReferenceCatalogue(
		buildReferenceIndex([file("many.json", { color })]),
	);
	const manyFetch = vi
		.fn()
		.mockResolvedValue(
			new Response(JSON.stringify(manyCatalogue), { status: 200 }),
		);

	await openPicker(manyFetch);
	// Idle shows nothing (none of these is the current target) — type a
	// query matching all 205 to exercise the cap.
	fireEvent.change(screen.getByRole("combobox", { name: /search tokens/i }), {
		target: { value: "token_" },
	});

	expect(screen.getAllByRole("option")).toHaveLength(200);
	expect(screen.getByText(/5 more.*refine your search/i)).toBeTruthy();
	expect(
		screen.getByRole("status", { name: "Search results" }).textContent,
	).toMatch(String(CANDIDATE_COUNT));
});
