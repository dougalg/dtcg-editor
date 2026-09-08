import { parseTokenFile } from "@dtcg-editor/token-core";
import { render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { LoadedTokenFile } from "../../lib/tokens/load-directory.ts";
import { buildReferenceCatalogue } from "../../lib/tokens/reference-catalogue.ts";
import type { ReferenceCandidate } from "../../lib/tokens/reference-catalogue-wire.ts";
import { buildReferenceIndex } from "../../lib/tokens/reference-index.ts";
import { CandidatePreview } from "./CandidatePreview.tsx";

afterEach(() => {
	document.body.innerHTML = "";
});

function file(relativePath: string, json: unknown): LoadedTokenFile {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) {
		throw new Error(`fixture failed to parse: ${result.error.message}`);
	}
	return { relativePath, document: result.value };
}

function candidateFor(
	displayPath: string,
	files: readonly LoadedTokenFile[],
): ReferenceCandidate {
	const found = buildReferenceCatalogue(
		buildReferenceIndex(files),
	).candidates.find((c) => c.displayPath === displayPath);
	if (found === undefined) {
		throw new Error(`no candidate ${displayPath}`);
	}
	return found;
}

test("a colour candidate renders the swatch preview, not just raw text", () => {
	const candidate = candidateFor("color.blue", [
		file("base.json", {
			color: {
				$type: "color",
				blue: { $value: { colorSpace: "srgb", components: [0, 0, 1] } },
			},
		}),
	]);

	const { container } = render(<CandidatePreview candidate={candidate} />);

	expect(container.querySelector('[style*="--swatch-color"]')).not.toBeNull();
});
