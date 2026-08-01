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

	const colorSpaces = new Set<string>();
	let hasNoneComponent = false;
	let hasLegacyHex = false;
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
	}

	for (const expected of ["srgb", "hsl", "oklch", "display-p3"]) {
		assert.ok(
			colorSpaces.has(expected),
			`expected coverage of colorSpace "${expected}"`,
		);
	}
	assert.ok(hasNoneComponent, "expected at least one 'none' component");
	assert.ok(hasLegacyHex, "expected at least one legacy bare-hex value");
});
