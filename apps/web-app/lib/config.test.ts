import assert from "node:assert/strict";
import { resolve } from "node:path";
import { afterEach, test, vi } from "vitest";
import { loadConfig } from "./config.ts";

/**
 * `dtcg-editor.config.mts` is imported once, statically, at this module's
 * top level (see `loadConfig`'s doc comment for why) — so by the time any
 * test runs, it has already been validated by `defineConfig`. There's no
 * remaining way to make `loadConfig()` itself fail; a malformed config is
 * covered by `lib/token-editors/define-config.test.ts` instead, and
 * `register()`'s graceful handling of that throw is exercised manually
 * (see `impl-summary.md`), since `instrumentation.ts`'s composition root
 * isn't unit-tested per its own existing convention.
 */

test("resolves the real dtcg-editor.config.mts's tokensDir relative to cwd", () => {
	const cwd = "/virtual/project";
	const result = loadConfig(cwd);
	assert.equal(result.isOk(), true);
	if (result.isOk()) {
		assert.equal(result.value.tokensDir, resolve(cwd, "../../sample_data"));
	}
});

test("defaults cwd to process.cwd() when omitted", () => {
	const result = loadConfig();
	assert.equal(result.isOk(), true);
	if (result.isOk()) {
		assert.equal(
			result.value.tokensDir,
			resolve(process.cwd(), "../../sample_data"),
		);
	}
});

/**
 * `getConfig()`/`setConfigCache()` are the exact two functions at the
 * center of the cross-chunk module-duplication bug this feature hit during
 * implementation (see `plan.md`'s Architecture Decisions and
 * `impl-summary.md`) — `getConfig()`'s fallback to `loadConfig()` on a cache
 * miss looked like unreachable defensive code but was actually load-bearing.
 * `vi.resetModules()` + a fresh dynamic `import()` per test gives each test
 * its own isolated module instance (and thus its own private `cachedConfig`),
 * so these don't depend on run order the way sharing one static import would.
 */
afterEach(() => {
	vi.resetModules();
});

test("getConfig() returns the cached value after setConfigCache()", async () => {
	const { getConfig, setConfigCache } = await import("./config.ts");
	const cached = { tokensDir: "/virtual/cached-tokens" };
	setConfigCache(cached);
	assert.deepEqual(getConfig(), cached);
});

test("getConfig() falls back to loadConfig() when this module instance's cache was never populated", async () => {
	const { getConfig } = await import("./config.ts");
	// No setConfigCache() call — this fresh module instance's cache starts
	// empty, exercising the fallback path directly rather than through a
	// real cross-chunk scenario (which needs a running Next.js server).
	const config = getConfig();
	assert.equal(config.tokensDir, resolve(process.cwd(), "../../sample_data"));
});
