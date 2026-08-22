import { defineConfig } from "@playwright/test";

// A dedicated, non-default port keeps this suite from accidentally attaching
// to an unrelated `next dev` server a developer already has running on 3000
// (e.g. in another terminal) — `reuseExistingServer` would happily reuse
// that server, which serves the real design-system tokens instead of the
// e2e fixtures below, causing confusing failures unrelated to the code
// under test.
const E2E_PORT = 3100;

export default defineConfig({
	testDir: "./e2e",
	use: {
		baseURL: `http://localhost:${E2E_PORT}`,
	},
	webServer: {
		command: process.env.CI
			? "pnpm run start"
			: "pnpm run build && pnpm run start",
		url: `http://localhost:${E2E_PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		// Serve stable, e2e-owned fixture tokens instead of the real design
		// system, whose content can change for unrelated reasons and break
		// these tests. See dtcg-editor.config.mts.
		env: {
			DTCG_EDITOR_TOKENS_DIR: "./e2e/fixtures/tokens",
			PORT: String(E2E_PORT),
		},
	},
});
