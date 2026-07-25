import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as listRoute from "./route.ts";

let fixtureDir: string;
let originalCwd: string;

before(async () => {
  originalCwd = process.cwd();
  fixtureDir = await mkdtemp(join(tmpdir(), "dtcg-tokens-route-"));
  const tokensDir = join(fixtureDir, "tokens");
  await mkdir(tokensDir);
  await writeFile(join(tokensDir, "good.json"), JSON.stringify({ x: { $value: "1" } }));
  await writeFile(join(tokensDir, "bad.json"), "{not valid json");
  await writeFile(join(fixtureDir, "dtcg-editor.config.json"), JSON.stringify({ tokensDir: "tokens" }));
  process.chdir(fixtureDir);
});

after(async () => {
  process.chdir(originalCwd);
  await rm(fixtureDir, { recursive: true, force: true });
});

test("GET lists discovered files", async () => {
  const response = await listRoute.GET();
  assert.equal(response.status, 200);
  const body = (await response.json()) as { files: { relativePath: string; valid: boolean }[] };
  assert.deepEqual(
    body.files.map((file) => file.relativePath).sort(),
    ["bad.json", "good.json"],
  );
});

test("exports only GET", () => {
  assert.deepEqual(Object.keys(listRoute), ["GET"]);
});
