import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { TokenReferenceValue } from "./TokenReferenceValue.tsx";

function wholeValueReference(): ResolvedReference {
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

test("renders the reference exactly as authored", () => {
	render(<TokenReferenceValue resolved={wholeValueReference()} />);
	expect(screen.getByText("{color.brand.blue}")).toBeTruthy();
});

test("renders a resolved color value as a swatch plus its text form", () => {
	const { container } = render(
		<TokenReferenceValue resolved={wholeValueReference()} />,
	);
	expect(container.querySelector('[style*="--swatch-color"]')).toBeTruthy();
	expect(container.textContent).toContain("srgb");
});

test("renders a resolved non-color value as its text form", () => {
	const resolved: ResolvedReference = {
		reference: { targetPath: ["space", "4"], at: [], raw: "{space.4}" },
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [{ path: ["space", "4"], file: "base.json", mode: undefined }],
					outcome: {
						kind: "resolved",
						value: { value: 1, unit: "rem" },
						type: "dimension",
					},
				},
				targetFile: "base.json",
			},
		],
	};
	render(<TokenReferenceValue resolved={resolved} />);
	expect(screen.getByText(/rem/)).toBeTruthy();
});

test("renders a chained reference showing the literal at the end of the chain", () => {
	const resolved: ResolvedReference = {
		reference: {
			targetPath: ["color", "action", "default"],
			at: [],
			raw: "{color.action.default}",
		},
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [
						{
							path: ["color", "action", "default"],
							file: "semantic.json",
							mode: undefined,
						},
						{
							path: ["color", "text", "primary"],
							file: "semantic.json",
							mode: undefined,
						},
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
				// The *direct* target's file (semantic.json, where
				// color.action.default's own target color.text.primary is
				// defined) — not base.json, where the chain eventually ends up.
				// Navigation stops at the direct target (FR-012); only the
				// displayed *value* reflects the full chain.
				targetFile: "semantic.json",
			},
		],
	};
	render(<TokenReferenceValue resolved={resolved} />);
	expect(screen.getByText("{color.action.default}")).toBeTruthy();
	expect(screen.getByText(/srgb/)).toBeTruthy();
	const link = screen.getByRole("link", { name: /color\.action\.default/ });
	expect(link.getAttribute("href")).toBe(
		"/tokens/semantic.json#color.action.default",
	);
});

test("the reference's own raw text is no longer an activatable link", () => {
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
	render(<TokenReferenceValue resolved={resolved} />);
	expect(
		screen.queryByRole("link", { name: /^\{color\.brand\.blue\}$/ }),
	).toBeNull();
	expect(screen.getByRole("link", { name: /color\.brand\.blue/ })).toBeTruthy();
});

test("delegates an unresolved outcome to ReferenceWarning", () => {
	const resolved: ResolvedReference = {
		reference: { targetPath: ["color", "nope"], at: [], raw: "{color.nope}" },
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [],
					outcome: { kind: "unresolved", missingPath: ["color", "nope"] },
				},
				targetFile: undefined,
			},
		],
	};
	render(<TokenReferenceValue resolved={resolved} />);
	expect(screen.getByRole("alert")).toBeTruthy();
});

test("delegates a group-target outcome to ReferenceWarning", () => {
	const resolved: ResolvedReference = {
		reference: { targetPath: ["color", "group"], at: [], raw: "{color.group}" },
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [],
					outcome: { kind: "group-target", groupPath: ["color", "group"] },
				},
				targetFile: undefined,
			},
		],
	};
	render(<TokenReferenceValue resolved={resolved} />);
	expect(screen.getByRole("alert").textContent).toMatch(/group/i);
});

test("delegates a circular outcome to ReferenceWarning", () => {
	const resolved: ResolvedReference = {
		reference: { targetPath: ["color", "a"], at: [], raw: "{color.a}" },
		outcomes: [
			{
				mode: undefined,
				chain: {
					steps: [],
					outcome: { kind: "circular", cyclePath: ["color", "a"] },
				},
				targetFile: undefined,
			},
		],
	};
	render(<TokenReferenceValue resolved={resolved} />);
	expect(screen.getByRole("alert").textContent).toMatch(/circular/i);
});

test("renders one outcome per mode for a multiply-defined target", () => {
	const resolved: ResolvedReference = {
		reference: { targetPath: ["text"], at: [], raw: "{text}" },
		outcomes: [
			{
				mode: "light",
				chain: {
					steps: [{ path: ["text"], file: "semantic.json", mode: "light" }],
					outcome: {
						kind: "resolved",
						value: { colorSpace: "srgb", components: [0, 0, 0] },
						type: "color",
					},
				},
				targetFile: "semantic.json",
			},
			{
				mode: "dark",
				chain: {
					steps: [{ path: ["text"], file: "dark.json", mode: "dark" }],
					outcome: {
						kind: "resolved",
						value: { colorSpace: "srgb", components: [1, 1, 1] },
						type: "color",
					},
				},
				targetFile: "dark.json",
			},
		],
	};
	render(<TokenReferenceValue resolved={resolved} />);
	expect(screen.getByText("light:")).toBeTruthy();
	expect(screen.getByText("dark:")).toBeTruthy();
});
