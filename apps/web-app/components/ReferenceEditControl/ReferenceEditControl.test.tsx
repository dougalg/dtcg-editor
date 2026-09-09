import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { StagedEditsContext } from "../../hooks/useStagedEdits.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { StagedEditsStore } from "../../lib/tokens/staged-edits-store.ts";
import { ReferenceEditControl } from "./ReferenceEditControl.tsx";

type TokenNode = Extract<PlainDtcgNode, { kind: "token" }>;

afterEach(() => {
	document.body.innerHTML = "";
});

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
