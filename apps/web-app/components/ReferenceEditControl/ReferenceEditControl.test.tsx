import { parseTokenFile } from "@dtcg-editor/token-core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { resetReferenceCatalogueCache } from "../../hooks/useReferenceCatalogue.ts";
import { StagedEditsContext } from "../../hooks/useStagedEdits.ts";
import type { LoadedTokenFile } from "../../lib/tokens/load-directory.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import { buildReferenceCatalogue } from "../../lib/tokens/reference-catalogue.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { buildReferenceIndex } from "../../lib/tokens/reference-index.ts";
import { StagedEditsStore } from "../../lib/tokens/staged-edits-store.ts";
import { ReferenceEditControl } from "./ReferenceEditControl.tsx";

type TokenNode = Extract<PlainDtcgNode, { kind: "token" }>;

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
	document.body.innerHTML = "";
	resetReferenceCatalogueCache();
});

function file(relativePath: string, json: unknown): LoadedTokenFile {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) throw new Error(result.error.message);
	return { relativePath, document: result.value };
}

function okFetch() {
	const catalogue = buildReferenceCatalogue(
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
	return vi
		.fn()
		.mockResolvedValue(
			new Response(JSON.stringify(catalogue), { status: 200 }),
		);
}

function referenceNode(): TokenNode {
	return {
		kind: "token",
		name: "text",
		path: ["text"],
		value: "{color.brand.blue}",
		declaredType: "color",
		effectiveType: "color",
		inferredType: undefined,
		description: undefined,
		deprecated: undefined,
	};
}

function resolvedColor(): ResolvedReference {
	return {
		reference: {
			targetPath: ["color", "brand", "blue"],
			at: [],
			raw: "{color.brand.blue}",
		},
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [
						{
							path: ["color", "brand", "blue"],
							file: "base.json",
							mode: undefined,
						},
					],
					outcome: {
						kind: "resolved",
						value: { colorSpace: "srgb", components: [0.2, 0.4, 0.9] },
						type: "color",
					},
				},
				targetFile: "base.json",
			},
		],
	};
}

function renderControl(
	overrides: Partial<Parameters<typeof ReferenceEditControl>[0]> = {},
) {
	const node = overrides.node ?? referenceNode();
	const store = new StagedEditsStore({
		initialTree: {
			kind: "group",
			name: "",
			path: [],
			declaredType: undefined,
			effectiveType: undefined,
			description: undefined,
			deprecated: undefined,
			children: [node],
		},
		referenceView: undefined,
		save: async () => true,
	});
	return render(
		<StagedEditsContext.Provider value={store}>
			<ul>
				<ReferenceEditControl
					node={node}
					currentName={node.name}
					onNameChange={vi.fn()}
					onNameBlur={vi.fn()}
					error={undefined}
					headingId="token-text-heading"
					rowTestId="token-text"
					effectiveType="color"
					headerExtra={null}
					tokenKey="text"
					relativePath="a.json"
					resolved={resolvedColor()}
					rawRef="{color.brand.blue}"
					onRepoint={vi.fn()}
					{...overrides}
				/>
			</ul>
		</StagedEditsContext.Provider>,
	);
}

test("resting output matches the TreeTokenNode path-1 baseline: name field, raw alias, resolved value, no validation error", () => {
	renderControl();

	expect(screen.getByLabelText("text name")).toBeTruthy();
	expect(screen.getByText("{color.brand.blue}")).toBeTruthy();
	expect(screen.getByText(/srgb/)).toBeTruthy();
	expect(screen.queryByRole("alert")).toBeNull();
});

test("the reference row shows a repoint trigger whose accessible name identifies the edited token", () => {
	renderControl();

	const trigger = screen.getByRole("combobox", {
		name: "Repoint reference for text",
	});
	expect(trigger.getAttribute("aria-expanded")).toBe("false");
});

test("picking a candidate through the hosted picker calls onRepoint with the alias value", async () => {
	const onRepoint = vi.fn();
	const editedNode: TokenNode = {
		...referenceNode(),
		name: "accent",
		path: ["color", "accent"],
		value: "{color.blue}",
	};
	renderControl({
		node: editedNode,
		currentName: "accent",
		rawRef: "{color.blue}",
		resolved: undefined,
		tokenKey: "color.accent",
		relativePath: "base.json",
		onRepoint,
		fetchImpl: okFetch(),
	});

	await act(async () => {
		fireEvent.click(
			screen.getByRole("combobox", { name: /repoint reference for/i }),
		);
		await Promise.resolve();
	});

	fireEvent.click(screen.getByRole("option", { name: "color.red" }));

	expect(onRepoint).toHaveBeenCalledWith("{color.red}");
});

test("when resolved is undefined (index build failed) the raw alias string is the resting value", () => {
	renderControl({ resolved: undefined });

	const rawValue = screen.getByText("{color.brand.blue}");
	expect(rawValue.className).toMatch(/value/);
	// No resolved-outcome preview is rendered without a server resolution.
	expect(screen.queryByText(/srgb/)).toBeNull();
	expect(screen.queryByRole("link")).toBeNull();
});

test("a name-field error is still surfaced through the shared FieldErrorSlot", () => {
	renderControl({
		error: { name: "That name is already taken", value: undefined },
	});

	expect(screen.getByRole("alert").textContent).toBe(
		"That name is already taken",
	);
});
