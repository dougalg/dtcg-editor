import { defineConfig } from "./lib/token-editors/define-config.ts";

export default defineConfig({
	// Lets e2e tests (see playwright.config.ts) point the running app at a
	// stable, test-owned fixtures directory instead of the real design
	// system, whose token content can change independently of the tests.
	tokensDir:
		process.env.DTCG_EDITOR_TOKENS_DIR ??
		"../../packages/design-system/src/design-tokens",
});
