export function exitOnFatalStartupError(message: string): never {
  console.error(`[dtcg-editor] Fatal startup error: ${message}`);
  process.exit(1);
}
