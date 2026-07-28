import { resolve } from "node:path";
import { err, fromThrowable, ok, type Result } from "neverthrow";
import { z } from "zod";
import { nodeReadFileSync } from "./platform/node-fs.ts";
import type { ReadTextFileSync } from "./platform/node-fs.ts";

export const CONFIG_FILE_NAME = "dtcg-editor.config.json";

export const ConfigFileSchema = z.object({
  tokensDir: z.string().min(1, "tokensDir must be a non-empty string"),
});

export interface Config {
  readonly tokensDir: string;
}

/** Returned for any problem loading or validating `dtcg-editor.config.json`. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Thrown by `getConfig()` if called before startup config validation has
 * succeeded — i.e. `register()` in `instrumentation.ts` did not run or did
 * not fail fast as designed. This should be unreachable in normal operation:
 * `register()` calls `loadConfig()` directly and populates the cache via
 * `setConfigCache()` before Next.js serves any request, or exits the process
 * on failure.
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
 * Reads and validates `dtcg-editor.config.json` from `cwd` (the process
 * working directory by default). This is the sanctioned entry point for the
 * config file — an external edge per this repo's validation conventions.
 */
export function loadConfig(
  cwd: string = process.cwd(),
  readFileFn: ReadTextFileSync = nodeReadFileSync,
): Result<Config, ConfigError> {
  const configPath = resolve(cwd, CONFIG_FILE_NAME);

  const readConfigFile = fromThrowable(
    () => readFileFn(configPath),
    (cause) => new ConfigError(`Could not read config file at "${configPath}": ${describeCause(cause)}`),
  );

  const parseConfigJson = fromThrowable(
    (raw: string) => JSON.parse(raw) as unknown,
    (cause) => new ConfigError(`Invalid JSON in config file at "${configPath}": ${describeCause(cause)}`),
  );

  return readConfigFile().andThen(parseConfigJson).andThen((parsed) => {
    const result = ConfigFileSchema.safeParse(parsed);
    if (!result.success) {
      const reasons = result.error.issues
        .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "<root>"}: ${issue.message}`)
        .join("; ");
      return err(new ConfigError(`Invalid config file at "${configPath}": ${reasons}`));
    }

    return ok({ tokensDir: resolve(cwd, result.data.tokensDir) });
  });
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

/** Memoized `loadConfig`, used by request-time code once startup has validated the config. */
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
