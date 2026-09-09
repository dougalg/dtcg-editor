import { parseTokenFile } from "@dtcg-editor/token-core";
import { render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { resolveIfRepointed } from "../../lib/tokens/hypothetical-resolution.ts";
import type { LoadedTokenFile } from "../../lib/tokens/load-directory.ts";
import { buildReferenceCatalogue } from "../../lib/tokens/reference-catalogue.ts";
import type { ReferenceCandidate } from "../../lib/tokens/reference-catalogue-wire.ts";
import { buildReferenceIndex } from "../../lib/tokens/reference-index.ts";
import type { ResolverModes } from "../../lib/tokens/resolver-file.ts";
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
	resolver?: ResolverModes,
): ReferenceCandidate {
	const found = buildReferenceCatalogue(
		buildReferenceIndex(files, resolver),
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

test("a chained candidate previews the end-of-chain value", () => {
	const candidate = candidateFor("brand", [
		file("base.json", {
			brand: { $type: "color", $value: "{leaf}" },
			leaf: { $type: "color", $value: { hex: "#abc123" } },
		}),
	]);

	const { getByText } = render(<CandidatePreview candidate={candidate} />);
	expect(getByText(/#abc123/)).toBeTruthy();
});

test("a multiply-defined candidate renders one mode-labelled row per mode", () => {
	const resolver: ResolverModes = {
		modes: ["light", "dark"],
		filesByMode: new Map([
			["light", ["base.json", "light.json"]],
			["dark", ["base.json", "dark.json"]],
		]),
	};
	const candidate = candidateFor(
		"t",
		[
			file("base.json", {}),
			file("light.json", { t: { $type: "color", $value: { hex: "#ffffff" } } }),
			file("dark.json", { t: { $type: "color", $value: { hex: "#000000" } } }),
		],
		resolver,
	);

	const { getByText } = render(<CandidatePreview candidate={candidate} />);
	expect(getByText("light:")).toBeTruthy();
	expect(getByText("dark:")).toBeTruthy();
	expect(getByText(/#ffffff/)).toBeTruthy();
	expect(getByText(/#000000/)).toBeTruthy();
});

test("a non-resolved outcome renders a ReferenceWarning instead of a value", () => {
	const candidate = candidateFor("c", [
		file("base.json", {
			c: { $type: "color", $value: "{color.ghost}" },
		}),
	]);

	const { getByRole } = render(<CandidatePreview candidate={candidate} />);
	const alert = getByRole("alert");
	expect(alert.textContent).toContain("Missing target");
});

test("diagnostic 'circular' renders the circular-reference icon and label", () => {
	const candidate = candidateFor("color.blue", [
		file("base.json", {
			color: { $type: "color", blue: { $value: { hex: "#00f" } } },
		}),
	]);

	const { getByText, container } = render(
		<CandidatePreview candidate={candidate} diagnostic="circular" />,
	);

	expect(getByText("circular-reference")).toBeTruthy();
	expect(container.querySelector("svg")).not.toBeNull();
});

test("diagnostic 'missing' and 'group' each render their own icon + label, distinct from circular", () => {
	const candidate = candidateFor("color.blue", [
		file("base.json", {
			color: { $type: "color", blue: { $value: { hex: "#00f" } } },
		}),
	]);

	const missing = render(
		<CandidatePreview candidate={candidate} diagnostic="missing" />,
	);
	expect(missing.getByText("missing target")).toBeTruthy();
	expect(missing.queryByText("circular-reference")).toBeNull();
	expect(missing.container.querySelector("svg")).not.toBeNull();
	missing.unmount();

	const group = render(
		<CandidatePreview candidate={candidate} diagnostic="group" />,
	);
	expect(group.getByText("group target")).toBeTruthy();
	expect(group.queryByText("circular-reference")).toBeNull();
});

test("with a hypothetical, renders the edited-token 'would resolve to' block, naming a cycle", () => {
	const files = [
		file("base.json", {
			edited: { $type: "color", $value: "{loop}" },
			loop: { $type: "color", $value: "{edited}" },
			clean: { $type: "color", $value: { hex: "#0f0" } },
		}),
	];
	const catalogue = buildReferenceCatalogue(buildReferenceIndex(files));
	const candidate = candidateFor("loop", files);

	// Repointing `edited` at `loop` closes the cycle.
	const hypothetical = resolveIfRepointed(["edited"], ["loop"], catalogue);
	const { getByText, getAllByRole } = render(
		<CandidatePreview candidate={candidate} hypothetical={hypothetical} />,
	);

	const caption = getByText(/would resolve to/i);
	expect(caption).toBeTruthy();
	// The "would resolve to" block itself shows the circular warning.
	const hypoBlock = caption.parentElement;
	expect(hypoBlock?.textContent).toContain("Circular reference");
	expect(
		getAllByRole("alert").some((a) =>
			a.textContent?.includes("Circular reference"),
		),
	).toBe(true);
});
