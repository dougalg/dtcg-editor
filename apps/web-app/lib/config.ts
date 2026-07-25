import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const CONFIG_FILE_NAME = "dtcg-editor.config.json";

const ConfigFileSchema = z.object({
  tokensDir: z.string().min(1, "tokensDir must be a non-empty string"),
});

export interface Config {
  readonly tokensDir: string;
}

/** Thrown for any problem loading or validating `dtcg-editor.config.json`. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Reads and validates `dtcg-editor.config.json` from `cwd` (the process
 * working directory by default). This is the sanctioned entry point for the
 * config file — an external edge per this repo's validation conventions.
 */
export function loadConfig(cwd: string = process.cwd()): Config {
  const configPath = resolve(cwd, CONFIG_FILE_NAME);

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch (cause) {
    throw new ConfigError(`Could not read config file at "${configPath}": ${describeCause(cause)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new ConfigError(`Invalid JSON in config file at "${configPath}": ${describeCause(cause)}`);
  }

  const result = ConfigFileSchema.safeParse(parsed);
  if (!result.success) {
    const reasons = result.error.issues
      .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "<root>"}: ${issue.message}`)
      .join("; ");
    throw new ConfigError(`Invalid config file at "${configPath}": ${reasons}`);
  }

  return { tokensDir: resolve(cwd, result.data.tokensDir) };
}

let cachedConfig: Config | undefined;

/** Memoized `loadConfig`, used by request-time code once startup has validated the config. */
export function getConfig(): Config {
  cachedConfig ??= loadConfig();
  return cachedConfig;
}
