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
