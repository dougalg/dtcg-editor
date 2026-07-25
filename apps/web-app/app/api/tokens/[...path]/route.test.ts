import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as readRoute from "./route.ts";

let fixtureDir: string;
let originalCwd: string;

before(async () => {
  originalCwd = process.cwd();
  fixtureDir = await mkdtemp(join(tmpdir(), "dtcg-tokens-path-route-"));
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

test("returns 200 for a valid file", async () => {
  const response = await readRoute.GET(new Request("http://localhost/api/tokens/good.json"), {
    params: Promise.resolve({ path: ["good.json"] }),
  });
  assert.equal(response.status, 200);
});

test("returns 422 for an invalid file", async () => {
  const response = await readRoute.GET(new Request("http://localhost/api/tokens/bad.json"), {
    params: Promise.resolve({ path: ["bad.json"] }),
  });
  assert.equal(response.status, 422);
});

test("returns 404 for a missing file", async () => {
  const response = await readRoute.GET(new Request("http://localhost/api/tokens/missing.json"), {
    params: Promise.resolve({ path: ["missing.json"] }),
  });
  assert.equal(response.status, 404);
});

test("returns 400 for a path-traversal attempt", async () => {
  const response = await readRoute.GET(new Request("http://localhost/api/tokens/x"), {
    params: Promise.resolve({ path: ["..", "..", "etc", "passwd"] }),
  });
  assert.equal(response.status, 400);
});

test("exports only GET", () => {
  assert.deepEqual(Object.keys(readRoute), ["GET"]);
});
