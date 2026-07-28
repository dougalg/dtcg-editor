import { test } from "vitest";
import assert from "node:assert/strict";
import { err, ok } from "neverthrow";
import { ConfigError, type Config } from "./lib/config.ts";
import { runRegister, type RegisterDeps } from "./instrumentation.ts";

function fakeDeps(overrides: Partial<RegisterDeps>): RegisterDeps & {
  calls: { loadConfig: number; setConfigCache: number; onFatalError: number };
  cachedConfig: Config | undefined;
  fatalErrorMessage: string | undefined;
} {
  const calls = { loadConfig: 0, setConfigCache: 0, onFatalError: 0 };
  let cachedConfig: Config | undefined;
  let fatalErrorMessage: string | undefined;

  return {
    getNextRuntime: () => "nodejs",
    loadConfig: () => {
      calls.loadConfig += 1;
      return ok({ tokensDir: "/virtual/tokens" });
    },
    setConfigCache: (config) => {
      calls.setConfigCache += 1;
      cachedConfig = config;
    },
    onFatalError: async (message) => {
      calls.onFatalError += 1;
      fatalErrorMessage = message;
    },
    ...overrides,
    calls,
    get cachedConfig() {
      return cachedConfig;
    },
    get fatalErrorMessage() {
      return fatalErrorMessage;
    },
  };
}

test("returns early without loading config when the runtime is not nodejs", async () => {
  const deps = fakeDeps({ getNextRuntime: () => "edge" });

  await runRegister(deps);

  assert.equal(deps.calls.loadConfig, 0);
  assert.equal(deps.calls.setConfigCache, 0);
  assert.equal(deps.calls.onFatalError, 0);
});

test("loads and caches config on success", async () => {
  const fakeConfig: Config = { tokensDir: "/virtual/tokens" };
  const deps = fakeDeps({
    getNextRuntime: () => "nodejs",
    loadConfig: () => ok(fakeConfig),
  });

  await runRegister(deps);

  assert.equal(deps.calls.setConfigCache, 1);
  assert.equal(deps.cachedConfig, fakeConfig);
  assert.equal(deps.calls.onFatalError, 0);
});

test("calls onFatalError with the error message on failure, does not cache", async () => {
  const deps = fakeDeps({
    getNextRuntime: () => "nodejs",
    loadConfig: () => err(new ConfigError("boom")),
  });

  await runRegister(deps);

  assert.equal(deps.calls.onFatalError, 1);
  assert.equal(deps.fatalErrorMessage, "boom");
  assert.equal(deps.calls.setConfigCache, 0);
});
