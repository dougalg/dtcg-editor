import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseTokenFile } from "./parse.ts";
import type { GroupNode, TokenNode } from "./types.ts";

const SAMPLE_PATH = fileURLToPath(
	new URL("../../../sample_data/color_scale.tokens.json", import.meta.url),
);

test("sample_data/color_scale.tokens.json parses successfully and has the FR-07 coverage", () => {
	const raw = readFileSync(SAMPLE_PATH, "utf-8");
	const result = parseTokenFile(raw);
	if (!result.isOk()) {
		assert.fail(`expected parseTokenFile to succeed: ${result.error.message}`);
	}

	const group = result.value.root.children.get("color-scale") as GroupNode;
	assert.ok(group && group.kind === "group");

	// Hue-bearing colorSpaces per the DTCG 2025.10 Color module; hue's valid
	// range is [0, 360) in all of them. Only used here to detect the FR-07
	// "deliberately out-of-range value" fixture — the full per-colorSpace
	// range table itself lives in `@dtcg-editor/token-type-color`, which
	// `token-core` must not depend on (token-type packages depend on
	// `token-core`, never the reverse).
	const HUE_BEARING_SPACES = new Set(["hsl", "hwb", "lch", "oklch"]);

	const colorSpaces = new Set<string>();
	let hasNoneComponent = false;
	let hasLegacyHex = false;
	let hasOutOfRangeHue = false;
	for (const child of group.children.values()) {
		const token = child as TokenNode;
		assert.equal(token.declaredType, "color");
		if (typeof token.value === "string") {
			hasLegacyHex = true;
			continue;
		}
		const value = token.value as { colorSpace: string; components: unknown[] };
		colorSpaces.add(value.colorSpace);
		if (value.components.includes("none")) {
			hasNoneComponent = true;
		}
		const hue =
			value.components[
				value.colorSpace === "lch" || value.colorSpace === "oklch" ? 2 : 0
			];
		if (
			HUE_BEARING_SPACES.has(value.colorSpace) &&
			typeof hue === "number" &&
			(hue < 0 || hue >= 360)
		) {
			hasOutOfRangeHue = true;
		}
	}

	for (const expected of ["srgb", "hsl", "oklch", "display-p3"]) {
		assert.ok(
			colorSpaces.has(expected),
			`expected coverage of colorSpace "${expected}"`,
		);
	}
	assert.ok(hasNoneComponent, "expected at least one 'none' component");
	assert.ok(hasLegacyHex, "expected at least one legacy bare-hex value");
	assert.ok(
		hasOutOfRangeHue,
		"expected at least one deliberately out-of-range value (FR-07)",
	);
});
