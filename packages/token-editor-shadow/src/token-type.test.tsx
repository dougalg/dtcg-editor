import type { ShadowLayer } from "@dtcg-editor/token-core";
import { ShadowValueSchema } from "@dtcg-editor/token-core";
import { expect, test } from "vitest";
import { ShadowEditor } from "./components/ShadowEditor/ShadowEditor.tsx";
import { ShadowPreview } from "./components/ShadowPreview/ShadowPreview.tsx";
import { shadowTokenType } from "./token-type.ts";

// This is a `.test.tsx` (Vitest), not a `.test.ts` (`node:test`), because
// `shadowTokenType` imports `ShadowEditor`/`ShadowPreview`, which are JSX
// components — `node:test`'s native TS type-stripping cannot parse JSX (per
// the constitution's Technology Stack section), so any test importing
// `token-type.ts` must run under this package's Vitest project instead.

const VALID_LAYER: ShadowLayer = {
	color: { colorSpace: "srgb", components: [0, 0, 0] },
	offsetX: { value: 0, unit: "px" },
	offsetY: { value: 2, unit: "px" },
	blur: { value: 4, unit: "px" },
	spread: { value: 0, unit: "px" },
};

test("shadowTokenType.type is 'shadow'", () => {
	expect(shadowTokenType.type).toBe("shadow");
});

test("shadowTokenType.valueSchema is ShadowValueSchema (accepts/rejects the same fixtures)", () => {
	expect(shadowTokenType.valueSchema.safeParse(VALID_LAYER).success).toBe(
		ShadowValueSchema.safeParse(VALID_LAYER).success,
	);
	expect(shadowTokenType.valueSchema.safeParse(VALID_LAYER).success).toBe(true);
	expect(shadowTokenType.valueSchema.safeParse([]).success).toBe(false);
});

test("shadowTokenType.serializeValue is the identity function for a bare-object value", () => {
	expect(shadowTokenType.serializeValue(VALID_LAYER)).toEqual(VALID_LAYER);
});

test("shadowTokenType.serializeValue is the identity function for an array value", () => {
	const arr = [VALID_LAYER, VALID_LAYER];
	expect(shadowTokenType.serializeValue(arr)).toEqual(arr);
});

test("shadowTokenType.Editor is ShadowEditor", () => {
	expect(shadowTokenType.Editor).toBe(ShadowEditor);
});

test("shadowTokenType.Preview is ShadowPreview", () => {
	expect(shadowTokenType.Preview).toBe(ShadowPreview);
});
