import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	use: {
		baseURL: "http://localhost:3000",
	},
	webServer: {
		command: process.env.CI
			? "pnpm run start"
			: "pnpm run build && pnpm run start",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		// Serve stable, e2e-owned fixture tokens instead of the real design
		// system, whose content can change for unrelated reasons and break
		// these tests. See dtcg-editor.config.mts.
		env: {
			DTCG_EDITOR_TOKENS_DIR: "./e2e/fixtures/tokens",
		},
	},
});
