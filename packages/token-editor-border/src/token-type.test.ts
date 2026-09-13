import { BorderValueSchema } from "@dtcg-editor/token-core";
import { expect, test } from "vitest";
import { BorderEditor } from "./components/BorderEditor/BorderEditor.tsx";
import { BorderPreview } from "./components/BorderPreview/BorderPreview.tsx";
import { borderTokenType } from "./token-type.ts";

const VALID_VALUE = {
	color: { colorSpace: "srgb", components: [1, 0, 0] },
	width: { value: 1, unit: "px" },
	style: "solid",
};

test("borderTokenType.type is 'border'", () => {
	expect(borderTokenType.type).toBe("border");
});

test("borderTokenType.valueSchema is BorderValueSchema (accepts/rejects the same fixtures)", () => {
	expect(borderTokenType.valueSchema.safeParse(VALID_VALUE).success).toBe(
		BorderValueSchema.safeParse(VALID_VALUE).success,
	);
	expect(borderTokenType.valueSchema.safeParse(VALID_VALUE).success).toBe(true);
	expect(
		borderTokenType.valueSchema.safeParse({ color: VALID_VALUE.color }).success,
	).toBe(false);
});

test("borderTokenType.serializeValue returns its input unchanged (identity)", () => {
	const parsed = borderTokenType.valueSchema.parse(VALID_VALUE);
	expect(borderTokenType.serializeValue(parsed)).toEqual(VALID_VALUE);
});

test("borderTokenType.Editor/Preview are the BorderEditor/BorderPreview functions", () => {
	expect(borderTokenType.Editor).toBe(BorderEditor);
	expect(borderTokenType.Preview).toBe(BorderPreview);
});
