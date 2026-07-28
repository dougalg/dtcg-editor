import { afterAll, beforeAll, test } from "vitest";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Logger } from "@dtcg-editor/errors";
import * as listRoute from "./route.ts";

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
let originalCwd: string;

beforeAll(async () => {
	originalCwd = process.cwd();
	fixtureDir = await mkdtemp(join(tmpdir(), "dtcg-tokens-route-"));
	const tokensDir = join(fixtureDir, "tokens");
	await mkdir(tokensDir);
	await writeFile(
		join(tokensDir, "good.json"),
		JSON.stringify({ x: { $value: "1" } }),
	);
	await writeFile(join(tokensDir, "bad.json"), "{not valid json");
	await writeFile(
		join(fixtureDir, "dtcg-editor.config.json"),
		JSON.stringify({ tokensDir: "tokens" }),
	);
	process.chdir(fixtureDir);
});

afterAll(async () => {
	process.chdir(originalCwd);
	await rm(fixtureDir, { recursive: true, force: true });
});

test("GET lists discovered files", async () => {
	const response = await listRoute.GET();
	assert.equal(response.status, 200);
	const body = (await response.json()) as {
		files: { relativePath: string; valid: boolean }[];
	};
	assert.deepEqual(body.files.map((file) => file.relativePath).sort(), [
		"bad.json",
		"good.json",
	]);
});

test("returns 500 when the token directory can't be scanned, logging the failure", async () => {
	const tokensDir = join(fixtureDir, "tokens");
	await chmod(tokensDir, 0o000);
	try {
		const { logger, state } = fakeLogger();
		const response = await listRoute.listTokenFiles(logger);
		assert.equal(response.status, 500);
		assert.equal(state.calls, 1);
	} finally {
		await chmod(tokensDir, 0o755);
	}
});

test("does not export any HTTP method handler other than GET", () => {
	const otherHttpMethods = [
		"POST",
		"PUT",
		"DELETE",
		"PATCH",
		"HEAD",
		"OPTIONS",
	];
	assert.ok("GET" in listRoute);
	for (const method of otherHttpMethods) {
		assert.ok(
			!(method in listRoute),
			`unexpected route handler export: ${method}`,
		);
	}
});
