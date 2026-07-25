import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanTokenDirectory } from "./scan.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "dtcg-scan-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("discovers *.json files at multiple nesting depths", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "a.json"), JSON.stringify({ x: { $value: "1" } }));
    await mkdir(join(dir, "nested"));
    await writeFile(join(dir, "nested", "b.json"), JSON.stringify({ y: { $value: "2" } }));
    await mkdir(join(dir, "nested", "deeper"));
    await writeFile(join(dir, "nested", "deeper", "c.json"), JSON.stringify({ z: { $value: "3" } }));

    const summaries = await scanTokenDirectory(dir);
    const relativePaths = summaries.map((summary) => summary.relativePath).sort();

    assert.deepEqual(relativePaths, ["a.json", "nested/b.json", "nested/deeper/c.json"]);
    assert.ok(summaries.every((summary) => summary.valid));
  });
});

test("isolates an invalid file from valid ones", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "good.json"), JSON.stringify({ x: { $value: "1" } }));
    await writeFile(join(dir, "bad.json"), "{not valid json");

    const summaries = await scanTokenDirectory(dir);

    const good = summaries.find((summary) => summary.relativePath === "good.json");
    assert.ok(good);
    assert.equal(good.valid, true);

    const bad = summaries.find((summary) => summary.relativePath === "bad.json");
    assert.ok(bad);
    if (bad.valid) {
      assert.fail("expected bad.json to be marked invalid");
    } else {
      assert.match(bad.error, /Invalid JSON/);
    }
  });
});

test("does not recurse into a symlinked subdirectory", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "a.json"), JSON.stringify({ x: { $value: "1" } }));
    await mkdir(join(dir, "real"));
    await writeFile(join(dir, "real", "b.json"), JSON.stringify({ y: { $value: "2" } }));
    await symlink(join(dir, "real"), join(dir, "link"), "dir");

    const summaries = await scanTokenDirectory(dir);
    const relativePaths = summaries.map((summary) => summary.relativePath).sort();

    assert.deepEqual(relativePaths, ["a.json", "real/b.json"]);
  });
});

test("ignores non-.json files", async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, "a.json"), JSON.stringify({ x: { $value: "1" } }));
    await writeFile(join(dir, "readme.md"), "not a token file");

    const summaries = await scanTokenDirectory(dir);
    assert.deepEqual(
      summaries.map((summary) => summary.relativePath),
      ["a.json"],
    );
  });
});
