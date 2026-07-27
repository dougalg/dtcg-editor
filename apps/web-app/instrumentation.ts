export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { loadConfig, setConfigCache } = await import("./lib/config.ts");

  const result = loadConfig();
  if (result.isErr()) {
    console.error(`[dtcg-editor] Fatal startup error: ${result.error.message}`);
    process.exit(1);
    return;
  }
  setConfigCache(result.value);
}
