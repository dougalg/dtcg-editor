import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test, vi } from "vitest";
import { StagedEditsContext } from "../../hooks/useStagedEdits.ts";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import type { PlainDtcgNode } from "../../lib/tokens/plain-node.ts";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { StagedEditsStore } from "../../lib/tokens/staged-edits-store.ts";
import { ReferenceEditControl } from "./ReferenceEditControl.tsx";

type TokenNode = Extract<PlainDtcgNode, { kind: "token" }>;

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

const node: TokenNode = {
	kind: "token",
	name: "text",
	path: ["color", "text"],
	value: "{color.brand.blue}",
	declaredType: "color",
	effectiveType: "color",
	inferredType: undefined,
	description: undefined,
	deprecated: undefined,
};

const resolved: ResolvedReference = {
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

test("the resting reference row (value display + closed repoint trigger) has no WCAG 2.2 AA violations", async () => {
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
	const { container } = render(
		<StagedEditsContext.Provider value={store}>
			<ul>
				<ReferenceEditControl
					node={node}
					currentName={node.name}
					onNameChange={vi.fn()}
					onNameBlur={vi.fn()}
					error={undefined}
					headingId="token-color.text-heading"
					rowTestId="token-color.text"
					effectiveType="color"
					headerExtra={null}
					tokenKey="color.text"
					relativePath="a.json"
					resolved={resolved}
					rawRef="{color.brand.blue}"
					onRepoint={vi.fn()}
				/>
			</ul>
		</StagedEditsContext.Provider>,
	);
	await expectNoViolations(container);
});
