import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { type InitConfigIO, runInitConfig } from "./init-config.ts";

const CONFIG_FILE_NAME = "dtcg-editor.config.mts";

/** The real, fixed location of `define-config.ts` — mirrors `init-config.ts`'s own `DEFINE_CONFIG_PATH`. */
const REAL_DEFINE_CONFIG_PATH = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../lib/token-editors/define-config.ts",
);

/**
 * Builds an injectable IO harness for `runInitConfig`: a writable `input`
 * stream tests can push simulated answers into, a readable `output` capture
 * buffer, and an in-memory `files` map backing `existsSync`/`writeFileSync`
 * — so both the interactive-prompt flow and fs reads/writes can be driven
 * end-to-end without touching real `process.stdin`/`process.stdout`/disk.
 */
function createIO(
	overrides: Partial<InitConfigIO> & { cwd: string },
): InitConfigIO & {
	input: PassThrough;
	answer: (line: string) => void;
	getOutput: () => string;
	files: Map<string, string>;
} {
	const files = new Map<string, string>();
	const input = new PassThrough();
	const output = new PassThrough();
	let captured = "";
	output.on("data", (chunk: Buffer) => {
		captured += chunk.toString("utf-8");
	});

	return {
		argv: [],
		input,
		output,
		isTTY: true,
		existsSync: (path) => files.has(path),
		writeFileSync: (path, data) => {
			files.set(path, data);
		},
		...overrides,
		answer: (line: string) => {
			input.write(`${line}\n`);
		},
		getOutput: () => captured,
		files,
	};
}

/**
 * Content assertion for the generated `.mts` module: checks it's a
 * `defineConfig({ ... })` call with the expected `tokensDir`, and — since
 * the import specifier is computed relative to `dir` rather than a fixed
 * string (see `init-config.ts`'s `defineConfigImportSpecifierFrom`) —
 * verifies that specifier actually *resolves* to the real `define-config.ts`
 * from `dir`, not just that it matches some expected literal text. Doesn't
 * dynamically import the generated string itself (the in-memory `files` map
 * has no real filesystem path a dynamic `import()` could resolve, so a real
 * `loadConfig()` round-trip isn't exercised here — `lib/config.test.ts`
 * covers `loadConfig()` itself).
 */
function assertGeneratedConfig(
	content: string,
	tokensDir: string,
	dir: string,
): void {
	const importMatch = /import \{ defineConfig \} from "([^"]+)";/.exec(content);
	assert.ok(
		importMatch,
		'expected an import { defineConfig } from "..."; line',
	);
	// biome-ignore lint/style/noNonNullAssertion: single capture group, assert.ok above already confirmed a match
	assert.equal(resolve(dir, importMatch[1]!), REAL_DEFINE_CONFIG_PATH);
	assert.match(content, /export default defineConfig\(/);
	assert.match(content, new RegExp(`tokensDir: ${JSON.stringify(tokensDir)}`));
	assert.match(content, /extensions: \[\]/);
	assert.equal(content.endsWith("\n"), true);
}

test("interactive mode writes a valid config on a single valid answer", async () => {
	const dir = "/virtual/project";
	const io = createIO({ argv: [], cwd: dir });
	const resultPromise = runInitConfig(io);
	io.answer("./tokens");
	const result = await resultPromise;

	assert.equal(result.isOk(), true);
	assertGeneratedConfig(
		io.files.get(join(dir, CONFIG_FILE_NAME)) ?? "",
		"./tokens",
		dir,
	);
});

test("flag-driven mode writes a valid config with zero prompts", async () => {
	const dir = "/virtual/project";
	const io = createIO({
		argv: ["--tokens-dir", "./tokens"],
		cwd: dir,
		isTTY: false,
	});
	const result = await runInitConfig(io);

	assert.equal(result.isOk(), true);
	assertGeneratedConfig(
		io.files.get(join(dir, CONFIG_FILE_NAME)) ?? "",
		"./tokens",
		dir,
	);
});

test("interactive mode re-prompts on an invalid answer before succeeding on retry", async () => {
	const dir = "/virtual/project";
	const io = createIO({ argv: [], cwd: dir });
	const resultPromise = runInitConfig(io);
	io.answer("");
	// Give the event loop a turn so the first (invalid) answer is processed
	// and the re-prompt is issued before the second answer is sent.
	await new Promise((resolve) => setTimeout(resolve, 10));
	io.answer("./tokens");
	const result = await resultPromise;

	assert.equal(result.isOk(), true);
	assert.match(io.getOutput(), /non-empty string/);
	assertGeneratedConfig(
		io.files.get(join(dir, CONFIG_FILE_NAME)) ?? "",
		"./tokens",
		dir,
	);
});

test("flag-driven mode rejects an invalid --tokens-dir and does not write a file", async () => {
	const dir = "/virtual/project";
	const io = createIO({ argv: ["--tokens-dir", ""], cwd: dir, isTTY: false });
	const result = await runInitConfig(io);

	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.match(result.error, /non-empty string/);
	}
	assert.equal(io.files.has(join(dir, CONFIG_FILE_NAME)), false);
});

test("interactive mode declines to overwrite an existing config file by default", async () => {
	const dir = "/virtual/project";
	const configPath = join(dir, CONFIG_FILE_NAME);
	const original =
		'import { defineConfig } from "./lib/token-editors/define-config.ts";\n\nexport default defineConfig({\n\ttokensDir: "./original",\n\textensions: [],\n});\n';

	const io = createIO({ argv: [], cwd: dir });
	io.files.set(configPath, original);
	const resultPromise = runInitConfig(io);
	io.answer("n");
	const result = await resultPromise;

	assert.equal(result.isOk(), true);
	assert.equal(io.files.get(configPath), original);
});

test("flag-driven mode refuses to overwrite an existing config file without --force", async () => {
	const dir = "/virtual/project";
	const configPath = join(dir, CONFIG_FILE_NAME);
	const original =
		'import { defineConfig } from "./lib/token-editors/define-config.ts";\n\nexport default defineConfig({\n\ttokensDir: "./original",\n\textensions: [],\n});\n';

	const io = createIO({
		argv: ["--tokens-dir", "./tokens"],
		cwd: dir,
		isTTY: false,
	});
	io.files.set(configPath, original);
	const result = await runInitConfig(io);

	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.match(
			result.error,
			new RegExp(configPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		);
	}
	assert.equal(io.files.get(configPath), original);
});

test("flag-driven --force overwrites an existing config file with the new value", async () => {
	const dir = "/virtual/project";
	const configPath = join(dir, CONFIG_FILE_NAME);

	const io = createIO({
		argv: ["--tokens-dir", "./new-tokens", "--force"],
		cwd: dir,
		isTTY: false,
	});
	io.files.set(
		configPath,
		'import { defineConfig } from "./lib/token-editors/define-config.ts";\n\nexport default defineConfig({\n\ttokensDir: "./original",\n\textensions: [],\n});\n',
	);
	const result = await runInitConfig(io);

	assert.equal(result.isOk(), true);
	assertGeneratedConfig(io.files.get(configPath) ?? "", "./new-tokens", dir);
});

test("--help returns usage text and does not write a file", async () => {
	const dir = "/virtual/project";
	const io = createIO({ argv: ["--help"], cwd: dir, isTTY: false });
	const result = await runInitConfig(io);

	assert.equal(result.isOk(), true);
	if (result.isOk()) {
		assert.match(result.value, /--tokens-dir/);
		assert.match(result.value, /--force/);
		assert.match(result.value, /--help/);
	}
	assert.equal(io.files.has(join(dir, CONFIG_FILE_NAME)), false);
});

test("omitting --tokens-dir with isTTY: false returns Err without prompting", async () => {
	const dir = "/virtual/project";
	const io = createIO({ argv: [], cwd: dir, isTTY: false });
	const result = await runInitConfig(io);

	assert.equal(result.isErr(), true);
	if (result.isErr()) {
		assert.match(result.error, /TTY/);
	}
});

test("the generated import resolves correctly even when io.cwd is not apps/web-app (regression)", async () => {
	// A cwd far from the real repo layout — the import specifier can no longer
	// be the fixed "./lib/token-editors/define-config.ts" string that only
	// happened to work when io.cwd matched apps/web-app itself.
	const dir = "/some/unrelated/directory";
	const io = createIO({
		argv: ["--tokens-dir", "./tokens"],
		cwd: dir,
		isTTY: false,
	});
	const result = await runInitConfig(io);

	assert.equal(result.isOk(), true);
	assertGeneratedConfig(
		io.files.get(join(dir, CONFIG_FILE_NAME)) ?? "",
		"./tokens",
		dir,
	);
});

test("the generated import is the short relative form when io.cwd is the real apps/web-app directory", async () => {
	const dir = dirname(dirname(fileURLToPath(import.meta.url))); // apps/web-app
	const io = createIO({
		argv: ["--tokens-dir", "./tokens"],
		cwd: dir,
		isTTY: false,
	});
	const result = await runInitConfig(io);

	assert.equal(result.isOk(), true);
	const content = io.files.get(join(dir, CONFIG_FILE_NAME)) ?? "";
	assert.match(
		content,
		/import \{ defineConfig \} from "\.\/lib\/token-editors\/define-config\.ts";/,
	);
});

test("a tokensDir that doesn't exist on disk still succeeds but produces a warning", async () => {
	const dir = "/virtual/project";
	const io = createIO({
		argv: ["--tokens-dir", "./does-not-exist"],
		cwd: dir,
		isTTY: false,
	});
	const result = await runInitConfig(io);

	assert.equal(result.isOk(), true);
	assert.match(io.getOutput(), /does not currently exist/);
});
