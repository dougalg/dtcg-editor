export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { getConfig, ConfigError } = await import("./lib/config.ts");

  try {
    getConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[dtcg-editor] Fatal startup error: ${error.message}`);
    } else {
      console.error("[dtcg-editor] Fatal startup error while loading configuration:", error);
    }
    process.exit(1);
  }
}
