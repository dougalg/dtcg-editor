import assert from "node:assert/strict";
import { parseTokenFile } from "@dtcg-editor/token-core";
import { test } from "vitest";
import { resolveIfRepointed } from "./hypothetical-resolution.ts";
import type { LoadedTokenFile } from "./load-directory.ts";
import { buildReferenceCatalogue } from "./reference-catalogue.ts";
import { buildReferenceIndex } from "./reference-index.ts";
import type { ResolverModes } from "./resolver-file.ts";

function file(relativePath: string, json: unknown): LoadedTokenFile {
	const result = parseTokenFile(JSON.stringify(json));
	if (result.isErr()) {
		throw new Error(`fixture failed to parse: ${result.error.message}`);
	}
	return { relativePath, document: result.value };
}

function catalogueFrom(
	files: readonly LoadedTokenFile[],
	resolver?: ResolverModes,
) {
	return buildReferenceCatalogue(buildReferenceIndex(files, resolver));
}

test("isSelf is true exactly when the candidate path equals the edited token path", () => {
	const catalogue = catalogueFrom([
		file("base.json", {
			a: { $type: "color", $value: { hex: "#f00" } },
			b: { $type: "color", $value: { hex: "#0f0" } },
		}),
	]);

	assert.equal(resolveIfRepointed(["a"], ["a"], catalogue).isSelf, true);
	assert.equal(resolveIfRepointed(["a"], ["b"], catalogue).isSelf, false);
});

function firstOutcome(h: {
	perMode: readonly { chain: { outcome: unknown } }[];
}) {
	return h.perMode[0]?.chain.outcome as { kind: string; value?: unknown };
}

test("a candidate resolving to a literal is previewed as resolved with that value", () => {
	const catalogue = catalogueFrom([
		file("base.json", {
			edited: { $type: "color", $value: "{other}" },
			other: { $type: "color", $value: { hex: "#0f0" } },
			target: { $type: "color", $value: { hex: "#00f" } },
		}),
	]);

	const outcome = firstOutcome(
		resolveIfRepointed(["edited"], ["target"], catalogue),
	);
	assert.equal(outcome.kind, "resolved");
	assert.deepEqual(outcome.value, { hex: "#00f" });
});

test("a candidate whose value is a chain is previewed as the end-of-chain value", () => {
	const catalogue = catalogueFrom([
		file("base.json", {
			edited: { $type: "color", $value: "{x}" },
			x: { $type: "color", $value: { hex: "#111" } },
			brand: { $type: "color", $value: "{leaf}" },
			leaf: { $type: "color", $value: { hex: "#abc" } },
		}),
	]);

	const outcome = firstOutcome(
		resolveIfRepointed(["edited"], ["brand"], catalogue),
	);
	assert.equal(outcome.kind, "resolved");
	assert.deepEqual(outcome.value, { hex: "#abc" });
});

test("a candidate that would close a loop back to the edited token is previewed as circular", () => {
	const catalogue = catalogueFrom([
		file("base.json", {
			edited: { $type: "color", $value: "{loop}" },
			loop: { $type: "color", $value: "{edited}" },
		}),
	]);

	const outcome = firstOutcome(
		resolveIfRepointed(["edited"], ["loop"], catalogue),
	);
	assert.equal(outcome.kind, "circular");
	assert.ok(
		"cyclePath" in outcome &&
			Array.isArray((outcome as { cyclePath: unknown }).cyclePath),
	);
});

test("a candidate whose real chain passes through the edited token — not itself circular today — is previewed as circular once the repoint is hypothesised", () => {
	// wheel -> hub is a perfectly clean, non-circular chain right now. Only
	// *because* hub is the token being repointed at wheel would hub -> wheel
	// -> hub become a cycle — the earlier implementation walked from
	// `candidatePath` (wheel) using the *unmodified* catalogue, so it never
	// revisited `editedTokenPath` and reported "resolved", missing this case.
	const catalogue = catalogueFrom([
		file("base.json", {
			hub: { $type: "color", $value: { hex: "#00f" } },
			wheel: { $type: "color", $value: "{hub}" },
		}),
	]);

	const outcome = firstOutcome(
		resolveIfRepointed(["hub"], ["wheel"], catalogue),
	);
	assert.equal(outcome.kind, "circular");
});

test("the hypothetical chain's steps start at the edited token itself, so the cycle names hub before wheel", () => {
	// FR-014 requires the preview to "name the tokens in the cycle" — that
	// only reads correctly (hub -> wheel -> hub, the order the repoint
	// actually creates) if the walk starts at editedTokenPath, not
	// candidatePath. Neither outcome.kind nor isSelf pins this: walking
	// from candidatePath instead still reaches "circular" for this fixture
	// (the editedTokenPath lookup override closes the loop either way), so
	// this asserts the steps themselves.
	const catalogue = catalogueFrom([
		file("base.json", {
			hub: { $type: "color", $value: { hex: "#00f" } },
			wheel: { $type: "color", $value: "{hub}" },
		}),
	]);

	const chain = resolveIfRepointed(["hub"], ["wheel"], catalogue).perMode[0]
		?.chain;
	assert.ok(chain !== undefined);
	assert.deepEqual(chain.steps[0]?.path, ["hub"]);
	assert.deepEqual(chain.steps[1]?.path, ["wheel"]);
});

test("a candidate path absent from the catalogue is previewed as unresolved", () => {
	const catalogue = catalogueFrom([
		file("base.json", {
			edited: { $type: "color", $value: "{other}" },
			other: { $type: "color", $value: { hex: "#0f0" } },
		}),
	]);

	const outcome = firstOutcome(
		resolveIfRepointed(["edited"], ["nope", "gone"], catalogue),
	);
	assert.equal(outcome.kind, "unresolved");
});

test("a multiply-defined candidate produces one perMode entry per mode, differing where the modes differ", () => {
	const resolver: ResolverModes = {
		modes: ["light", "dark"],
		filesByMode: new Map([
			["light", ["base.json", "light.json"]],
			["dark", ["base.json", "dark.json"]],
		]),
	};
	const catalogue = catalogueFrom(
		[
			file("base.json", { edited: { $type: "color", $value: "{t}" } }),
			file("light.json", { t: { $type: "color", $value: { hex: "#fff" } } }),
			file("dark.json", { t: { $type: "color", $value: { hex: "#000" } } }),
		],
		resolver,
	);

	const h = resolveIfRepointed(["edited"], ["t"], catalogue);
	assert.deepEqual(
		h.perMode.map((p) => p.mode),
		["light", "dark"],
	);
	const light = h.perMode[0]?.chain.outcome as { value: unknown };
	const dark = h.perMode[1]?.chain.outcome as { value: unknown };
	assert.deepEqual(light.value, { hex: "#fff" });
	assert.deepEqual(dark.value, { hex: "#000" });
});

test("the synthetic lookup picks the definition for the requested mode, else the last", () => {
	const resolver: ResolverModes = {
		modes: ["light", "dark"],
		filesByMode: new Map([
			["light", ["base.json", "light.json"]],
			["dark", ["base.json"]],
		]),
	};
	// `t` is defined only under light; the dark lookup must fall back to that
	// last definition rather than resolving to nothing.
	const catalogue = catalogueFrom(
		[
			file("base.json", { edited: { $type: "color", $value: "{t}" } }),
			file("light.json", { t: { $type: "color", $value: { hex: "#fff" } } }),
		],
		resolver,
	);

	const h = resolveIfRepointed(["edited"], ["t"], catalogue);
	for (const entry of h.perMode) {
		assert.equal(
			(entry.chain.outcome as { kind: string }).kind,
			"resolved",
			`mode ${entry.mode} should still resolve`,
		);
	}
});
