import { test } from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Logger } from "@dtcg-editor/errors";
import { TokenParseError } from "@dtcg-editor/token-core";
import { FileNotFoundError, readAndParseTokenFile } from "./read.ts";
import { PathTraversalError } from "./path-safety.ts";

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

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "dtcg-read-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("returns Ok for a valid file", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "good.json"), JSON.stringify({ x: { $value: "1" } }));
    const result = await readAndParseTokenFile(dir, "good.json");
    assert.equal(result.isOk(), true);
  });
});

test("returns FileNotFoundError for a missing file", async () => {
  await withTempDir(async (dir) => {
    const result = await readAndParseTokenFile(dir, "missing.json");
    assert.equal(result.isErr(), true);
    if (result.isErr()) {
      assert.ok(result.error instanceof FileNotFoundError);
    }
  });
});

test("returns PathTraversalError for an unsafe path", async () => {
  await withTempDir(async (dir) => {
    const result = await readAndParseTokenFile(dir, "../../etc/passwd");
    assert.equal(result.isErr(), true);
    if (result.isErr()) {
      assert.ok(result.error instanceof PathTraversalError);
    }
  });
});

test("returns TokenParseError for invalid JSON content", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "bad.json"), "{not valid json");
    const result = await readAndParseTokenFile(dir, "bad.json");
    assert.equal(result.isErr(), true);
    if (result.isErr()) {
      assert.ok(result.error instanceof TokenParseError);
    }
  });
});

test("returns a logged UnknownError for a non-ENOENT read failure", async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, "unreadable.json");
    await writeFile(filePath, JSON.stringify({ x: { $value: "1" } }));
    await chmod(filePath, 0o000);

    try {
      const { logger, state } = fakeLogger();
      const result = await readAndParseTokenFile(dir, "unreadable.json", logger);

      assert.equal(result.isErr(), true);
      if (result.isErr() && !(result.error instanceof Error)) {
        assert.equal(result.error.kind, "unknown");
      } else {
        assert.fail("expected an UnknownError (plain object, not an Error subclass)");
      }
      assert.equal(state.calls, 1);
    } finally {
      await chmod(filePath, 0o644);
    }
  });
});
