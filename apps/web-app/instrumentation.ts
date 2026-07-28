export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { loadConfig, setConfigCache } = await import("./lib/config.ts");

  const result = loadConfig();
  if (result.isErr()) {
    const { exitOnFatalStartupError } = await import("./lib/fatal-startup-error.ts");
    exitOnFatalStartupError(result.error.message);
    return;
  }
  setConfigCache(result.value);
}
