import { parseTokenFile } from "@dtcg-editor/token-core";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";
import { resolveIfRepointed } from "../../lib/tokens/hypothetical-resolution.ts";
import type { LoadedTokenFile } from "../../lib/tokens/load-directory.ts";
import { buildReferenceCatalogue } from "../../lib/tokens/reference-catalogue.ts";
import { buildReferenceIndex } from "../../lib/tokens/reference-index.ts";
import { CandidatePreview } from "./CandidatePreview.tsx";

function file(relativePath: string, json: unknown): LoadedTokenFile {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) {
		throw new Error(result.error.message);
	}
	return { relativePath, document: result.value };
}

const FILES = [
	file("base.json", {
		color: { $type: "color", blue: { $value: { hex: "#00f" } } },
		hub: { $type: "color", $value: { hex: "#0f0" } },
		wheel: { $type: "color", $value: "{hub}" },
	}),
];
const CATALOGUE = buildReferenceCatalogue(buildReferenceIndex(FILES));
const BLUE = CATALOGUE.candidates.find((c) => c.displayPath === "color.blue");
// `wheel` resolves cleanly today; repointing `hub` at `wheel` (below) closes
// a cycle — the hypothetical fully replaces `wheel`'s own preview here
// (FR-009, revised 2026-09-12), so this exercises the circular-warning
// rendering path inside a hypothetical block.
const WHEEL = CATALOGUE.candidates.find((c) => c.displayPath === "wheel");

async function expectNoViolations(container: Element) {
	const results = await axe.run(container, {
		runOnly: { type: "tag", values: [...WCAG_22_AA_TAGS] },
	});
	expect(results.violations).toEqual([]);
}

test("no WCAG 2.2 AA violations — plain resolved preview", async () => {
	const { container } = render(
		<ul>
			<li>
				{BLUE !== undefined ? <CandidatePreview candidate={BLUE} /> : null}
			</li>
		</ul>,
	);
	await expectNoViolations(container);
});

test("no WCAG 2.2 AA violations — each diagnostic marker", async () => {
	if (BLUE === undefined) throw new Error("fixture");
	for (const diagnostic of ["missing", "group", "circular"] as const) {
		const { container, unmount } = render(
			<ul>
				<li>
					<CandidatePreview candidate={BLUE} diagnostic={diagnostic} />
				</li>
			</ul>,
		);
		await expectNoViolations(container);
		unmount();
	}
});

test("no WCAG 2.2 AA violations — with a hypothetical block", async () => {
	if (WHEEL === undefined) throw new Error("fixture");
	const hypothetical = resolveIfRepointed(["hub"], ["wheel"], CATALOGUE);
	const { container } = render(
		<ul>
			<li>
				<CandidatePreview candidate={WHEEL} hypothetical={hypothetical} />
			</li>
		</ul>,
	);
	await expectNoViolations(container);
});
