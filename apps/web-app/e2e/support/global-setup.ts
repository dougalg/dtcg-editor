import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const webAppRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Builds the app once before either `webServer` starts. Needed because
 * `playwright.config.ts` now runs two Next.js servers on two ports (the
 * default fixtures, and the token-reference fixtures) that both read their
 * `DTCG_EDITOR_TOKENS_DIR` from `process.env` at server-start time rather
 * than at build time — so a single `.next` build safely serves both, and
 * running `next build` from each server's own start command (as the
 * single-server config used to) would race two concurrent builds against
 * the same `.next` output directory.
 *
 * Skipped in CI, where `pnpm build` already runs as its own pipeline step
 * before `pnpm test:a11y` — matching this repo's prior CI/non-CI command
 * split (`playwright.config.ts`'s `START_COMMAND`, pre-multi-server).
 */
export default function globalSetup(): void {
	if (process.env.CI) {
		return;
	}
	execFileSync("pnpm", ["run", "build"], {
		cwd: webAppRoot,
		stdio: "inherit",
	});
}
