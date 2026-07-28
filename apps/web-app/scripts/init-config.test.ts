import { test } from "vitest";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { loadConfig } from "../lib/config.ts";
import { runInitConfig, type InitConfigIO } from "./init-config.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "dtcg-init-config-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Builds an injectable IO harness for `runInitConfig`: a writable `input`
 * stream tests can push simulated answers into, and a readable `output`
 * capture buffer, so interactive prompts (including re-prompts) can be
 * driven end-to-end without touching real `process.stdin`/`process.stdout`.
 */
function createIO(overrides: Partial<InitConfigIO> & { cwd: string }): InitConfigIO & {
  input: PassThrough;
  answer: (line: string) => void;
  getOutput: () => string;
} {
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
    ...overrides,
    answer: (line: string) => {
      input.write(`${line}\n`);
    },
    getOutput: () => captured,
  };
}

test("interactive mode writes a valid config on a single valid answer", async () => {
  await withTempDir(async (dir) => {
    const io = createIO({ argv: [], cwd: dir });
    const resultPromise = runInitConfig(io);
    io.answer("./tokens");
    const result = await resultPromise;

    assert.equal(result.isOk(), true);
    const written = JSON.parse(await readFile(join(dir, "dtcg-editor.config.json"), "utf-8")) as unknown;
    assert.deepEqual(written, { tokensDir: "./tokens" });
  });
});

test("flag-driven mode writes a valid config with zero prompts, and the file loads via loadConfig()", async () => {
  await withTempDir(async (dir) => {
    const io = createIO({ argv: ["--tokens-dir", "./tokens"], cwd: dir, isTTY: false });
    const result = await runInitConfig(io);

    assert.equal(result.isOk(), true);
    const raw = await readFile(join(dir, "dtcg-editor.config.json"), "utf-8");
    assert.deepEqual(JSON.parse(raw) as unknown, { tokensDir: "./tokens" });
    assert.equal(raw.endsWith("\n"), true);

    const loaded = loadConfig(dir);
    assert.equal(loaded.isOk(), true);
  });
});

test("interactive mode re-prompts on an invalid answer before succeeding on retry", async () => {
  await withTempDir(async (dir) => {
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
    const written = JSON.parse(await readFile(join(dir, "dtcg-editor.config.json"), "utf-8")) as unknown;
    assert.deepEqual(written, { tokensDir: "./tokens" });
  });
});

test("flag-driven mode rejects an invalid --tokens-dir and does not write a file", async () => {
  await withTempDir(async (dir) => {
    const io = createIO({ argv: ["--tokens-dir", ""], cwd: dir, isTTY: false });
    const result = await runInitConfig(io);

    assert.equal(result.isErr(), true);
    if (result.isErr()) {
      assert.match(result.error, /non-empty string/);
    }
    await assert.rejects(readFile(join(dir, "dtcg-editor.config.json"), "utf-8"));
  });
});

test("interactive mode declines to overwrite an existing config file by default", async () => {
  await withTempDir(async (dir) => {
    const configPath = join(dir, "dtcg-editor.config.json");
    const original = JSON.stringify({ tokensDir: "./original" }, null, 2) + "\n";
    await writeFile(configPath, original);

    const io = createIO({ argv: [], cwd: dir });
    const resultPromise = runInitConfig(io);
    io.answer("n");
    const result = await resultPromise;

    assert.equal(result.isOk(), true);
    const after = await readFile(configPath, "utf-8");
    assert.equal(after, original);
  });
});

test("flag-driven mode refuses to overwrite an existing config file without --force", async () => {
  await withTempDir(async (dir) => {
    const configPath = join(dir, "dtcg-editor.config.json");
    const original = JSON.stringify({ tokensDir: "./original" }, null, 2) + "\n";
    await writeFile(configPath, original);

    const io = createIO({ argv: ["--tokens-dir", "./tokens"], cwd: dir, isTTY: false });
    const result = await runInitConfig(io);

    assert.equal(result.isErr(), true);
    if (result.isErr()) {
      assert.match(result.error, new RegExp(configPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    const after = await readFile(configPath, "utf-8");
    assert.equal(after, original);
  });
});

test("flag-driven --force overwrites an existing config file with the new value", async () => {
  await withTempDir(async (dir) => {
    const configPath = join(dir, "dtcg-editor.config.json");
    await writeFile(configPath, JSON.stringify({ tokensDir: "./original" }, null, 2) + "\n");

    const io = createIO({ argv: ["--tokens-dir", "./new-tokens", "--force"], cwd: dir, isTTY: false });
    const result = await runInitConfig(io);

    assert.equal(result.isOk(), true);
    const after = JSON.parse(await readFile(configPath, "utf-8")) as unknown;
    assert.deepEqual(after, { tokensDir: "./new-tokens" });
  });
});

test("--help returns usage text and does not write a file", async () => {
  await withTempDir(async (dir) => {
    const io = createIO({ argv: ["--help"], cwd: dir, isTTY: false });
    const result = await runInitConfig(io);

    assert.equal(result.isOk(), true);
    if (result.isOk()) {
      assert.match(result.value, /--tokens-dir/);
      assert.match(result.value, /--force/);
      assert.match(result.value, /--help/);
    }
    await assert.rejects(readFile(join(dir, "dtcg-editor.config.json"), "utf-8"));
  });
});

test("omitting --tokens-dir with isTTY: false returns Err without prompting", async () => {
  await withTempDir(async (dir) => {
    const io = createIO({ argv: [], cwd: dir, isTTY: false });
    const result = await runInitConfig(io);

    assert.equal(result.isErr(), true);
    if (result.isErr()) {
      assert.match(result.error, /TTY/);
    }
  });
});

test("a tokensDir that doesn't exist on disk still succeeds but produces a warning", async () => {
  await withTempDir(async (dir) => {
    const io = createIO({ argv: ["--tokens-dir", "./does-not-exist"], cwd: dir, isTTY: false });
    const result = await runInitConfig(io);

    assert.equal(result.isOk(), true);
    assert.match(io.getOutput(), /does not currently exist/);
  });
});
