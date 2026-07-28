import { test } from "vitest";
import assert from "node:assert/strict";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { loadConfig } from "../lib/config.ts";
import { runInitConfig, type InitConfigIO } from "./init-config.ts";
import type { ReadTextFileSync } from "../lib/platform/node-fs.ts";

/**
 * Builds an injectable IO harness for `runInitConfig`: a writable `input`
 * stream tests can push simulated answers into, a readable `output` capture
 * buffer, and an in-memory `files` map backing `existsSync`/`writeFileSync`
 * — so both the interactive-prompt flow and fs reads/writes can be driven
 * end-to-end without touching real `process.stdin`/`process.stdout`/disk.
 */
function createIO(overrides: Partial<InitConfigIO> & { cwd: string }): InitConfigIO & {
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

test("interactive mode writes a valid config on a single valid answer", async () => {
  const dir = "/virtual/project";
  const io = createIO({ argv: [], cwd: dir });
  const resultPromise = runInitConfig(io);
  io.answer("./tokens");
  const result = await resultPromise;

  assert.equal(result.isOk(), true);
  const written = JSON.parse(io.files.get(join(dir, "dtcg-editor.config.json")) ?? "") as unknown;
  assert.deepEqual(written, { tokensDir: "./tokens" });
});

test("flag-driven mode writes a valid config with zero prompts, and the file loads via loadConfig()", async () => {
  const dir = "/virtual/project";
  const io = createIO({ argv: ["--tokens-dir", "./tokens"], cwd: dir, isTTY: false });
  const result = await runInitConfig(io);

  assert.equal(result.isOk(), true);
  const raw = io.files.get(join(dir, "dtcg-editor.config.json")) ?? "";
  assert.deepEqual(JSON.parse(raw) as unknown, { tokensDir: "./tokens" });
  assert.equal(raw.endsWith("\n"), true);

  const readFileFn: ReadTextFileSync = (path) => {
    const content = io.files.get(path);
    if (content === undefined) {
      const error = new Error(`ENOENT: no such file or directory, open '${path}'`) as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }
    return content;
  };
  const loaded = loadConfig(dir, readFileFn);
  assert.equal(loaded.isOk(), true);
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
  const written = JSON.parse(io.files.get(join(dir, "dtcg-editor.config.json")) ?? "") as unknown;
  assert.deepEqual(written, { tokensDir: "./tokens" });
});

test("flag-driven mode rejects an invalid --tokens-dir and does not write a file", async () => {
  const dir = "/virtual/project";
  const io = createIO({ argv: ["--tokens-dir", ""], cwd: dir, isTTY: false });
  const result = await runInitConfig(io);

  assert.equal(result.isErr(), true);
  if (result.isErr()) {
    assert.match(result.error, /non-empty string/);
  }
  assert.equal(io.files.has(join(dir, "dtcg-editor.config.json")), false);
});

test("interactive mode declines to overwrite an existing config file by default", async () => {
  const dir = "/virtual/project";
  const configPath = join(dir, "dtcg-editor.config.json");
  const original = JSON.stringify({ tokensDir: "./original" }, null, 2) + "\n";

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
  const configPath = join(dir, "dtcg-editor.config.json");
  const original = JSON.stringify({ tokensDir: "./original" }, null, 2) + "\n";

  const io = createIO({ argv: ["--tokens-dir", "./tokens"], cwd: dir, isTTY: false });
  io.files.set(configPath, original);
  const result = await runInitConfig(io);

  assert.equal(result.isErr(), true);
  if (result.isErr()) {
    assert.match(result.error, new RegExp(configPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.equal(io.files.get(configPath), original);
});

test("flag-driven --force overwrites an existing config file with the new value", async () => {
  const dir = "/virtual/project";
  const configPath = join(dir, "dtcg-editor.config.json");

  const io = createIO({ argv: ["--tokens-dir", "./new-tokens", "--force"], cwd: dir, isTTY: false });
  io.files.set(configPath, JSON.stringify({ tokensDir: "./original" }, null, 2) + "\n");
  const result = await runInitConfig(io);

  assert.equal(result.isOk(), true);
  const after = JSON.parse(io.files.get(configPath) ?? "") as unknown;
  assert.deepEqual(after, { tokensDir: "./new-tokens" });
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
  assert.equal(io.files.has(join(dir, "dtcg-editor.config.json")), false);
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

test("a tokensDir that doesn't exist on disk still succeeds but produces a warning", async () => {
  const dir = "/virtual/project";
  const io = createIO({ argv: ["--tokens-dir", "./does-not-exist"], cwd: dir, isTTY: false });
  const result = await runInitConfig(io);

  assert.equal(result.isOk(), true);
  assert.match(io.getOutput(), /does not currently exist/);
});
