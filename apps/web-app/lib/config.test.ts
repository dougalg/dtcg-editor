import { test } from "vitest";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { ConfigError, CONFIG_FILE_NAME, loadConfig } from "./config.ts";
import type { ReadTextFileSync } from "./platform/node-fs.ts";

const cwd = "/virtual/project";

function mockReadFileSync(files: Record<string, string>): ReadTextFileSync {
  return (path) => {
    if (!(path in files)) {
      const error = new Error(`ENOENT: no such file or directory, open '${path}'`) as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }
    return files[path];
  };
}

test("returns ConfigError when the config file is missing", () => {
  const readFileFn = mockReadFileSync({});
  const result = loadConfig(cwd, readFileFn);
  assert.equal(result.isErr(), true);
  if (result.isErr()) {
    assert.ok(result.error instanceof ConfigError);
  }
});

test("returns ConfigError on invalid JSON", () => {
  const readFileFn = mockReadFileSync({
    [resolve(cwd, CONFIG_FILE_NAME)]: "{not valid json",
  });
  const result = loadConfig(cwd, readFileFn);
  assert.equal(result.isErr(), true);
  if (result.isErr()) {
    assert.ok(result.error instanceof ConfigError);
  }
});

test("returns ConfigError when tokensDir is missing", () => {
  const readFileFn = mockReadFileSync({
    [resolve(cwd, CONFIG_FILE_NAME)]: JSON.stringify({}),
  });
  const result = loadConfig(cwd, readFileFn);
  assert.equal(result.isErr(), true);
  if (result.isErr()) {
    assert.ok(result.error instanceof ConfigError);
  }
});

test("returns ConfigError when tokensDir is an empty string", () => {
  const readFileFn = mockReadFileSync({
    [resolve(cwd, CONFIG_FILE_NAME)]: JSON.stringify({ tokensDir: "" }),
  });
  const result = loadConfig(cwd, readFileFn);
  assert.equal(result.isErr(), true);
  if (result.isErr()) {
    assert.ok(result.error instanceof ConfigError);
  }
});

test("resolves a relative tokensDir to an absolute path", () => {
  const readFileFn = mockReadFileSync({
    [resolve(cwd, CONFIG_FILE_NAME)]: JSON.stringify({ tokensDir: "./tokens" }),
  });
  const result = loadConfig(cwd, readFileFn);
  assert.equal(result.isOk(), true);
  if (result.isOk()) {
    assert.equal(result.value.tokensDir, resolve(cwd, "tokens"));
  }
});
