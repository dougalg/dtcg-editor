import { afterAll, beforeAll, test } from "vitest";
import assert from "node:assert/strict";
import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Logger } from "@dtcg-editor/errors";
import { setConfigCache } from "../../../../lib/config.ts";
import * as readRoute from "./route.ts";

function patchRequest(edits: unknown): Request {
	return new Request("http://localhost/api/tokens/x", {
		method: "PATCH",
		body: JSON.stringify({ edits }),
	});
}

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

async function writeFixture(name: string, content: unknown): Promise<void> {
	await writeFile(join(fixtureDir, "tokens", name), JSON.stringify(content));
}

async function readFixture(name: string): Promise<unknown> {
	return JSON.parse(
		await readFile(join(fixtureDir, "tokens", name), "utf-8"),
	) as unknown;
}

let fixtureDir: string;

beforeAll(async () => {
	fixtureDir = await mkdtemp(join(tmpdir(), "dtcg-tokens-path-route-"));
	const tokensDir = join(fixtureDir, "tokens");
	await mkdir(tokensDir);
	await writeFile(
		join(tokensDir, "good.json"),
		JSON.stringify({ x: { $value: "1" } }),
	);
	await writeFile(join(tokensDir, "bad.json"), "{not valid json");
	// Populates `getConfig()`'s cache directly (mirrors what `register()` does
	// at real startup) rather than going through a written `dtcg-editor.config.mts`
	// + dynamic import — `tokensDir` here is already absolute, so nothing in
	// the request-time code paths under test depends on `process.cwd()`.
	setConfigCache({ tokensDir });
});

afterAll(async () => {
	await rm(fixtureDir, { recursive: true, force: true });
});

test("returns 200 for a valid file", async () => {
	const response = await readRoute.GET(
		new Request("http://localhost/api/tokens/good.json"),
		{
			params: Promise.resolve({ path: ["good.json"] }),
		},
	);
	assert.equal(response.status, 200);
});

test("returns 422 for an invalid file", async () => {
	const response = await readRoute.GET(
		new Request("http://localhost/api/tokens/bad.json"),
		{
			params: Promise.resolve({ path: ["bad.json"] }),
		},
	);
	assert.equal(response.status, 422);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "invalid-file");
});

test("returns 404 for a missing file", async () => {
	const response = await readRoute.GET(
		new Request("http://localhost/api/tokens/missing.json"),
		{
			params: Promise.resolve({ path: ["missing.json"] }),
		},
	);
	assert.equal(response.status, 404);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "not-found");
});

test("returns 400 for a path-traversal attempt", async () => {
	const response = await readRoute.GET(
		new Request("http://localhost/api/tokens/x"),
		{
			params: Promise.resolve({ path: ["..", "..", "etc", "passwd"] }),
		},
	);
	assert.equal(response.status, 400);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "validation");
});

test("PATCH writes a single edit to disk (AC-04)", async () => {
	await writeFixture("patch-single.json", {
		spacing: {
			small: {
				$type: "dimension",
				$value: { value: 4, unit: "px" },
				$description: "Small spacing",
			},
		},
	});

	const response = await readRoute.patchTokenFile(
		patchRequest([
			{ path: ["spacing", "small"], value: { value: 8, unit: "px" } },
		]),
		"patch-single.json",
	);
	assert.equal(response.status, 200);

	const onDisk = (await readFixture("patch-single.json")) as {
		spacing: { small: { $value: unknown } };
	};
	assert.deepEqual(onDisk.spacing.small.$value, { value: 8, unit: "px" });
});

test("PATCH writes multiple pending edits in one write, leaving other data unchanged (AC-04, AC-05)", async () => {
	await writeFixture("patch-multi.json", {
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
			large: { $type: "dimension", $value: { value: 16, unit: "px" } },
		},
		color: {
			red: {
				$type: "color",
				$value: "#ff0000",
				$extensions: { "com.example.tool": { foo: "bar" } },
			},
		},
	});

	const response = await readRoute.patchTokenFile(
		patchRequest([
			{
				path: ["spacing", "small"],
				name: "tiny",
				value: { value: 2, unit: "px" },
			},
			{ path: ["spacing", "large"], description: "Large spacing" },
		]),
		"patch-multi.json",
	);
	assert.equal(response.status, 200);

	const onDisk = (await readFixture("patch-multi.json")) as {
		spacing: {
			tiny?: { $value: unknown };
			small?: unknown;
			large: { $description: string };
		};
		color: { red: { $value: string; $extensions: unknown } };
	};
	assert.equal(onDisk.spacing.small, undefined);
	assert.deepEqual(onDisk.spacing.tiny?.$value, { value: 2, unit: "px" });
	assert.equal(onDisk.spacing.large.$description, "Large spacing");
	assert.equal(onDisk.color.red.$value, "#ff0000");
	assert.deepEqual(onDisk.color.red.$extensions, {
		"com.example.tool": { foo: "bar" },
	});
});

test("PATCH returns 400 for an invalid dimension value (AC-02)", async () => {
	await writeFixture("patch-invalid-value.json", {
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
		},
	});

	const response = await readRoute.patchTokenFile(
		patchRequest([{ path: ["spacing", "small"], value: { value: 4 } }]),
		"patch-invalid-value.json",
	);
	assert.equal(response.status, 400);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "validation");
});

test("PATCH returns 400 for a rename collision (AC-03)", async () => {
	await writeFixture("patch-collision.json", {
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
			large: { $type: "dimension", $value: { value: 16, unit: "px" } },
		},
	});

	const response = await readRoute.patchTokenFile(
		patchRequest([{ path: ["spacing", "small"], name: "large" }]),
		"patch-collision.json",
	);
	assert.equal(response.status, 400);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "validation");
});

test("PATCH allows a same-batch rename that frees a name another edit in the batch then claims", async () => {
	await writeFixture("patch-chained-rename.json", {
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
			large: { $type: "dimension", $value: { value: 16, unit: "px" } },
		},
	});

	// "large" renames away from its name in the same batch that "small" claims it —
	// this must not be rejected by a stale, pre-batch collision check.
	const response = await readRoute.patchTokenFile(
		patchRequest([
			{ path: ["spacing", "large"], name: "big" },
			{ path: ["spacing", "small"], name: "large" },
		]),
		"patch-chained-rename.json",
	);
	assert.equal(response.status, 200);

	const onDisk = (await readFixture("patch-chained-rename.json")) as {
		spacing: { big?: unknown; large?: unknown; small?: unknown };
	};
	assert.ok("big" in onDisk.spacing);
	assert.ok("large" in onDisk.spacing);
	assert.equal(onDisk.spacing.small, undefined);
});

test("PATCH returns 400 when attempting to edit a non-dimension token", async () => {
	await writeFixture("patch-non-dimension.json", {
		color: { red: { $type: "color", $value: "#ff0000" } },
	});

	const response = await readRoute.patchTokenFile(
		patchRequest([{ path: ["color", "red"], value: "#00ff00" }]),
		"patch-non-dimension.json",
	);
	assert.equal(response.status, 400);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "validation");
});

test("PATCH returns 404 for a missing file", async () => {
	const response = await readRoute.patchTokenFile(
		patchRequest([{ path: ["x"], value: { value: 1, unit: "px" } }]),
		"does-not-exist.json",
	);
	assert.equal(response.status, 404);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "not-found");
});

test("PATCH returns 400 for a path-traversal attempt", async () => {
	const response = await readRoute.patchTokenFile(
		patchRequest([{ path: ["x"], value: { value: 1, unit: "px" } }]),
		"../../etc/passwd",
	);
	assert.equal(response.status, 400);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "validation");
});

test("PATCH returns 500 when the write fails", async () => {
	await writeFixture("patch-write-fails.json", {
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
		},
	});
	const filePath = join(fixtureDir, "tokens", "patch-write-fails.json");
	await chmod(filePath, 0o444);

	try {
		const { logger, state } = fakeLogger();
		const response = await readRoute.patchTokenFile(
			patchRequest([
				{ path: ["spacing", "small"], value: { value: 8, unit: "px" } },
			]),
			"patch-write-fails.json",
			logger,
		);
		assert.equal(response.status, 500);
		assert.equal(state.calls, 1);
		const body = (await response.json()) as { kind?: string };
		assert.equal(body.kind, "unknown");
	} finally {
		await chmod(filePath, 0o644);
	}
});

test("PATCH renames a group, moving descendants to the new path (AC-05, AC-07)", async () => {
	await writeFixture("patch-group-rename.json", {
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
		},
	});

	const response = await readRoute.patchTokenFile(
		patchRequest([{ path: ["spacing"], name: "gaps" }]),
		"patch-group-rename.json",
	);
	assert.equal(response.status, 200);

	const onDisk = (await readFixture("patch-group-rename.json")) as {
		spacing?: unknown;
		gaps?: { small: { $value: unknown } };
	};
	assert.equal(onDisk.spacing, undefined);
	assert.deepEqual(onDisk.gaps?.small.$value, { value: 4, unit: "px" });
});

test("PATCH rejects a group edit that supplies a value (AC-05)", async () => {
	await writeFixture("patch-group-value.json", {
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
		},
	});

	const response = await readRoute.patchTokenFile(
		patchRequest([{ path: ["spacing"], value: { value: 1, unit: "px" } }]),
		"patch-group-value.json",
	);
	assert.equal(response.status, 400);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "validation");
});

test("PATCH rejects a group edit that supplies a description (AC-05)", async () => {
	await writeFixture("patch-group-description.json", {
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
		},
	});

	const response = await readRoute.patchTokenFile(
		patchRequest([{ path: ["spacing"], description: "nope" }]),
		"patch-group-description.json",
	);
	assert.equal(response.status, 400);
	const body = (await response.json()) as { kind?: string };
	assert.equal(body.kind, "validation");
});

test("PATCH saves a group rename together with a descendant token edit in one request (AC-08)", async () => {
	await writeFixture("patch-group-and-descendant.json", {
		spacing: {
			small: { $type: "dimension", $value: { value: 4, unit: "px" } },
		},
	});

	const response = await readRoute.patchTokenFile(
		patchRequest([
			{ path: ["spacing"], name: "gaps" },
			{ path: ["spacing", "small"], value: { value: 8, unit: "px" } },
		]),
		"patch-group-and-descendant.json",
	);
	assert.equal(response.status, 200);

	const onDisk = (await readFixture("patch-group-and-descendant.json")) as {
		spacing?: unknown;
		gaps?: { small: { $value: unknown } };
	};
	assert.equal(onDisk.spacing, undefined);
	assert.deepEqual(onDisk.gaps?.small.$value, { value: 8, unit: "px" });
});

test("exports only GET and PATCH as HTTP method handlers", () => {
	const otherHttpMethods = ["POST", "PUT", "DELETE", "HEAD", "OPTIONS"];
	assert.ok("GET" in readRoute);
	assert.ok("PATCH" in readRoute);
	for (const method of otherHttpMethods) {
		assert.ok(
			!(method in readRoute),
			`unexpected route handler export: ${method}`,
		);
	}
});
