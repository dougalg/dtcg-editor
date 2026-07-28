import type { Result } from "neverthrow";

/**
 * Structural stand-ins for `lib/config.ts`'s `Config`/`ConfigError` types.
 * Deliberately NOT imported (even as a type-only import) from
 * `./lib/config.ts`: Turbopack's Edge Runtime static-analysis scan treats
 * any import specifier reaching that module — type-only or not — as a real
 * graph edge, and flags `config.ts`'s (and its `node-fs.ts` dependency's)
 * `node:path`/`node:fs` usage as a result, even though `register()` below
 * only ever reaches the real module via a dynamic `import()`. `loadConfig`'s
 * actual return type (`Result<Config, ConfigError>`) is structurally
 * assignable to `Result<RegisteredConfig, Error>` — `Config` is exactly
 * `{ readonly tokensDir: string }`, and `ConfigError extends Error` — so
 * `register()`'s real `loadConfig` satisfies `RegisterDeps` with no cast.
 */
export interface RegisteredConfig {
	readonly tokensDir: string;
}

export interface RegisterDeps {
	loadConfig: () => Result<RegisteredConfig, Error>;
	setConfigCache: (config: RegisteredConfig) => void;
	getNextRuntime: () => string | undefined;
	onFatalError: (message: string) => Promise<void>;
}

/**
 * Injectable core of Next.js's `register()` startup hook: validates the
 * app's config file and populates `getConfig()`'s cache before any request
 * is served, or reports a fatal startup error. All real process I/O
 * (`process.env`, the fatal-exit path) is passed in via `deps` so this can
 * be driven end-to-end in tests without touching real `process.exit`/
 * `process.env`/`console`. Mirrors the `runInitConfig`/`main()` and
 * `patchTokenFile`/`PATCH` injectable-core/thin-wrapper precedents.
 */
export async function runRegister(deps: RegisterDeps): Promise<void> {
	if (deps.getNextRuntime() !== "nodejs") {
		return;
	}

	const result = deps.loadConfig();
	if (result.isErr()) {
		await deps.onFatalError(result.error.message);
		return;
	}
	deps.setConfigCache(result.value);
}

/**
 * Thin, Next.js-signature-constrained composition root. The
 * `process.env.NEXT_RUNTIME` guard must stay textually *before* the dynamic
 * `import("./lib/config.ts")` — this is what lets Next.js's build-time env
 * inlining dead-code-eliminate the import (and everything reachable through
 * it, including `node-fs.ts`'s `node:fs`) out of the Edge Runtime bundle.
 * Moving the import above this check (or behind an indirection the bundler
 * can't statically resolve) reintroduces the Edge Runtime warning the
 * separate "Fix Edge Runtime Warning" feature fixed — verified empirically
 * during this refactor. `runRegister`'s own `getNextRuntime()` branch below
 * is kept too, purely so the injectable core stays independently testable
 * (AC-05) without relying on this file's real `process.env`.
 */
export async function register(): Promise<void> {
	if (process.env.NEXT_RUNTIME !== "nodejs") {
		return;
	}

	const { loadConfig, setConfigCache } = await import("./lib/config.ts");
	await runRegister({
		loadConfig,
		setConfigCache,
		getNextRuntime: () => process.env.NEXT_RUNTIME,
		onFatalError: async (message) => {
			const { exitOnFatalStartupError } =
				await import("./lib/fatal-startup-error.ts");
			exitOnFatalStartupError(message);
		},
	});
}
