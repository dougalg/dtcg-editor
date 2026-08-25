import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, test } from "vitest";
import { patchTokenFile } from "../../app/api/tokens/[...path]/route.ts";
import { TokenTree } from "../../components/TokenTree/TokenTree.tsx";
import { setConfigCache } from "../config.ts";
import type { PlainDtcgNode } from "./plain-node.ts";

/**
 * The client (`TreeTokenNode.tsx`) and server (`route.ts`'s `patchTokenFile`)
 * both hoist a reference check above per-type validation — see
 * contracts/reference-validation.md. Both call the same `parseReference`
 * from `@dtcg-editor/token-core`, so they cannot literally diverge in what
 * counts as a reference, but `docs/history.md` (2026-08-02) records a real
 * prior incident where this exact client/server pair drifted anyway (one
 * side generalized a rule the other didn't). This test guards the
 * *observable behavior* of each side's real code path — not by calling
 * `parseReference` twice, which would be tautological — so a future change
 * that re-implements either side's check independently, rather than
 * sharing `parseReference`, would be caught here.
 *
 * Every test value is a `color` token's `$value`, deliberately chosen to
 * never itself be a syntactically valid color — so "accepted" can only mean
 * "classified as a reference", isolating exactly the decision under test.
 */
const TEST_VALUES: readonly {
	readonly label: string;
	readonly value: string;
	readonly isReference: boolean;
}[] = [
	{
		label: "a genuine reference",
		value: "{color.brand.blue}",
		isReference: true,
	},
	{ label: "a single-segment reference", value: "{brand}", isReference: true },
	{
		label: "a string merely containing braces",
		value: "a {b} c",
		isReference: false,
	},
	{
		label: "an empty-body reference-shaped string",
		value: "{}",
		isReference: false,
	},
	{ label: "an unterminated brace", value: "{a.b", isReference: false },
	{ label: "a plain non-hex string", value: "not-a-color", isReference: false },
];

function colorTree(value: unknown): PlainDtcgNode {
	return {
		kind: "group",
		name: "",
		path: [],
		declaredType: undefined,
		effectiveType: undefined,
		description: undefined,
		deprecated: undefined,
		children: [
			{
				kind: "token",
				name: "text",
				path: ["text"],
				value,
				declaredType: "color",
				effectiveType: "color",
				inferredType: undefined,
				description: undefined,
				deprecated: undefined,
			},
		],
	};
}

function clientAcceptsAsReference(value: string): boolean {
	render(<TokenTree node={colorTree(value)} relativePath="agreement.json" />);
	const accepted = screen.queryByRole("alert") === null;
	return accepted;
}

afterEach(() => {
	document.body.innerHTML = "";
});

let fixtureDir: string;

beforeAll(async () => {
	fixtureDir = await mkdtemp(join(tmpdir(), "dtcg-reference-agreement-"));
	const tokensDir = join(fixtureDir, "tokens");
	await mkdir(tokensDir);
	setConfigCache({ tokensDir });
});

afterAll(async () => {
	await rm(fixtureDir, { recursive: true, force: true });
});

async function serverAcceptsAsReference(value: string): Promise<boolean> {
	const fileName = `agreement-${Math.abs(value.length * 7919).toString(36)}.json`;
	await writeFile(
		join(fixtureDir, "tokens", fileName),
		JSON.stringify({
			text: {
				$type: "color",
				$value: { colorSpace: "srgb", components: [0, 0, 0] },
			},
		}),
	);
	const response = await patchTokenFile(
		new Request(`http://localhost/api/tokens/${fileName}`, {
			method: "PATCH",
			body: JSON.stringify({ edits: [{ path: ["text"], value }] }),
		}),
		fileName,
	);
	return response.status === 200;
}

for (const { label, value, isReference } of TEST_VALUES) {
	test(`client and server agree on "${label}"`, async () => {
		const client = clientAcceptsAsReference(value);
		const server = await serverAcceptsAsReference(value);
		assert.equal(
			client,
			isReference,
			`client accepted-as-reference mismatch for ${JSON.stringify(value)}`,
		);
		assert.equal(
			server,
			isReference,
			`server accepted-as-reference mismatch for ${JSON.stringify(value)}`,
		);
		assert.equal(
			client,
			server,
			`client/server disagree for ${JSON.stringify(value)}`,
		);
	});
}
