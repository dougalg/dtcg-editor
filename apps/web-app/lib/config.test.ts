import { test } from "vitest";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigError, loadConfig } from "./config.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "dtcg-config-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("throws ConfigError when the config file is missing", async () => {
  await withTempDir(async (dir) => {
    assert.throws(() => loadConfig(dir), ConfigError);
  });
});

test("throws ConfigError on invalid JSON", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "dtcg-editor.config.json"), "{not valid json");
    assert.throws(() => loadConfig(dir), ConfigError);
  });
});

test("throws ConfigError when tokensDir is missing", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "dtcg-editor.config.json"), JSON.stringify({}));
    assert.throws(() => loadConfig(dir), ConfigError);
  });
});

test("throws ConfigError when tokensDir is an empty string", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "dtcg-editor.config.json"), JSON.stringify({ tokensDir: "" }));
    assert.throws(() => loadConfig(dir), ConfigError);
  });
});

test("resolves a relative tokensDir to an absolute path", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "dtcg-editor.config.json"), JSON.stringify({ tokensDir: "./tokens" }));
    const config = loadConfig(dir);
    assert.equal(config.tokensDir, join(dir, "tokens"));
  });
});
