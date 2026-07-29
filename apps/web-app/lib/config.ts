import { resolve } from "node:path";
import { ok, type Result } from "neverthrow";
import dtcgEditorConfig from "./token-editors/user-config.ts";

export interface Config {
	readonly tokensDir: string;
}

/**
 * Returned for any problem loading or validating `dtcg-editor.config.mts`.
 * Not actually constructed anywhere in production code anymore — a real
 * validation failure now happens as a `defineConfig` throw during module
 * evaluation (see `loadConfig`'s doc comment), which `loadConfig()` never
 * gets a chance to observe and wrap. Kept, with `loadConfig`'s `Result`
 * return type, for API consistency and because `instrumentation.ts`'s
 * `RegisterDeps.loadConfig` and its tests are typed/written against a
 * `Result`-returning shape; only `instrumentation.test.ts`'s fake still
 * constructs one.
 */
export class ConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigError";
	}
}

/**
 * Thrown by `getConfig()` if called before startup config validation has
 * succeeded and the request-time module instance's own fallback `loadConfig()`
 * call (below) also fails — extremely unlikely, since a failing `loadConfig()`
 * means `dtcg-editor.config.mts` itself failed to evaluate, which would have
 * already crashed the process via `instrumentation.ts`'s `register()` before
 * any request was served.
 */
export class ConfigNotInitializedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigNotInitializedError";
	}
}

export function describeCause(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Resolves `dtcg-editor.config.mts` (imported once at this module's top
 * level, via `./token-editors/user-config.ts`) into a `Config`. The import
 * is deliberately *static*, not a dynamic `import()` inside this function:
 * Next.js/Turbopack bundles `instrumentation.ts`'s dynamic `import("./lib/config.ts")`
 * and a page/Route Handler's static `import ... from "./lib/config.ts"` into
 * *separate chunks*, each getting its own copy of this module's top-level
 * state — confirmed empirically (`register()` calling `setConfigCache()` in
 * one chunk never becomes visible to `getConfig()` in another). A static
 * top-level import means the config is evaluated (and validated by
 * `defineConfig`, which throws on failure) once per chunk, at the moment
 * each chunk first loads this module — including a chunk reached via
 * `instrumentation.ts`'s dynamic import, whose rejected promise still
 * surfaces that throw to `register()`'s `try`/`catch`, per this repo's Error
 * Handling convention. `loadConfig()` itself can no longer actually fail
 * (the config was already validated by the time it runs) but keeps
 * returning a `Result` for API consistency and as a defensive fallback path
 * for `getConfig()` below, given the chunk-splitting behavior above means
 * every chunk needs to be able to self-populate its own cache.
 */
export function loadConfig(cwd: string = process.cwd()): Result<Config, ConfigError> {
	return ok({ tokensDir: resolve(cwd, dtcgEditorConfig.tokensDir) });
}

let cachedConfig: Config | undefined;

/**
 * Populates `getConfig()`'s memoization cache. Called by `instrumentation.ts`'s
 * `register()` after a successful startup `loadConfig()`, since `register()`
 * calls `loadConfig()` directly (not `getConfig()`) to branch on its `Result`.
 */
export function setConfigCache(config: Config): void {
	cachedConfig = config;
}

/**
 * Memoized `loadConfig`, used by request-time code once startup has
 * validated the config. Falls back to calling `loadConfig()` directly if
 * this module instance's own cache was never populated — see `loadConfig`'s
 * doc comment for why that's a real, expected case (a different bundled
 * chunk than the one `instrumentation.ts`'s `register()` populated), not
 * just defensive dead code.
 */
export function getConfig(): Config {
	if (cachedConfig !== undefined) {
		return cachedConfig;
	}

	const result = loadConfig();
	if (result.isErr()) {
		throw new ConfigNotInitializedError(
			`getConfig() called before startup config validation succeeded: ${result.error.message}`,
		);
	}

	cachedConfig = result.value;
	return cachedConfig;
}
