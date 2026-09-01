import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Logger } from "@dtcg-editor/errors";
import { afterAll, beforeAll, test } from "vitest";
import { setConfigCache } from "../../../../lib/config.ts";
import { ReferenceCatalogueSchema } from "../../../../lib/tokens/reference-catalogue-wire.ts";
import * as route from "./route.ts";

function fakeLogger(): { logger: Logger; state: { calls: number } } {
	const state = { calls: 0 };
	return {
		logger: {
			error() {
				state.calls += 1;
			},
		},
		state,
	};
}

let fixtureDir: string;
let tokensDir: string;

beforeAll(async () => {
	fixtureDir = await mkdtemp(join(tmpdir(), "dtcg-references-route-"));
	tokensDir = join(fixtureDir, "tokens");
	await mkdir(tokensDir);
	await writeFile(
		join(tokensDir, "base.json"),
		JSON.stringify({
			color: { $type: "color", blue: { $value: { hex: "#0000ff" } } },
		}),
	);
	await writeFile(
		join(tokensDir, "semantic.json"),
		JSON.stringify({ text: { $type: "color", $value: "{color.blue}" } }),
	);
	setConfigCache({ tokensDir });
});

afterAll(async () => {
	await rm(fixtureDir, { recursive: true, force: true });
});

test("GET returns 200 with a body validating ReferenceCatalogueSchema", async () => {
	const response = await route.GET();
	assert.equal(response.status, 200);

	const body = await response.json();
	const parsed = ReferenceCatalogueSchema.safeParse(body);
	assert.equal(parsed.success, true);
	assert.deepEqual(parsed.data?.candidates.map((c) => c.displayPath).sort(), [
		"color.blue",
		"text",
	]);
});

test("returns 500 with kind:unknown, via the injected logger, when the directory can't be read", async () => {
	await chmod(tokensDir, 0o000);
	try {
		const { logger, state } = fakeLogger();
		const response = await route.listReferenceCatalogue(logger);
		assert.equal(response.status, 500);
		const body = (await response.json()) as { kind?: string };
		assert.equal(body.kind, "unknown");
		assert.equal(state.calls, 1);
	} finally {
		await chmod(tokensDir, 0o755);
	}
});

test("a present-but-invalid resolver file yields 200 with modes: []", async () => {
	const resolverPath = join(tokensDir, "tokens.resolver.json");
	await writeFile(resolverPath, "{ not valid json");
	try {
		const response = await route.GET();
		assert.equal(response.status, 200);
		const body = (await response.json()) as { modes: string[] };
		assert.deepEqual(body.modes, []);
	} finally {
		await rm(resolverPath, { force: true });
	}
});
