import { defineConfig } from "@playwright/test";

// Dedicated, non-default ports keep these suites from accidentally attaching
// to an unrelated `next dev` server a developer already has running on 3000
// (e.g. in another terminal) — `reuseExistingServer` would happily reuse
// that server, which serves the real design-system tokens instead of the
// e2e fixtures below, causing confusing failures unrelated to the code
// under test.
const E2E_PORT = 3100;
// A second, separate server+port for the token-reference fixtures. These
// fixtures deliberately include a broken, a circular, and an unparseable
// file (see e2e/fixtures/token-references/) — dropping them into the
// default fixtures directory above would change what home.spec.ts and
// tokens-page.spec.ts see, since both assert on that directory's file
// listing. A second server keeps the two fixture sets from interfering.
const TOKEN_REFERENCES_PORT = 3101;
// A third, separate server+port for the inferred-type fixture (spec
// 008-token-core-coherence): its one token has no `$type` anywhere in its
// chain by design, which would change what home.spec.ts/tokens-page.spec.ts
// see if dropped into the default fixtures directory — same rationale as
// the token-references server above.
const INFERRED_TYPE_PORT = 3102;

export default defineConfig({
	testDir: "./e2e",
	// Builds once before either server starts (skipped in CI, where `pnpm
	// build` already ran as its own pipeline step) — see global-setup.ts for
	// why two servers can no longer each run their own `build && start`.
	globalSetup: "./e2e/support/global-setup.ts",
	use: {
		baseURL: `http://localhost:${E2E_PORT}`,
		// Explicit (not just Playwright's implicit default) so a stray global
		// config or CI env change can't silently start popping up browser
		// windows. Opt into a visible browser with `pnpm test:a11y:headed`.
		headless: true,
	},
	// Three projects, scoped by spec filename, so each hits its own server —
	// no other change to how existing specs run (no device emulation added).
	projects: [
		{
			name: "default",
			testIgnore: ["token-references.spec.ts", "inferred-type.spec.ts"],
			use: { baseURL: `http://localhost:${E2E_PORT}` },
		},
		{
			name: "token-references",
			// keyboard-navigation.spec.ts also matches "default" above — it
			// holds both fixture sets' tests in one file, each gated by
			// `testInfo.project.name` (see that file's own comment), since
			// Playwright routes a whole *file* to a project, not individual
			// tests within it.
			testMatch: ["token-references.spec.ts", "keyboard-navigation.spec.ts"],
			use: { baseURL: `http://localhost:${TOKEN_REFERENCES_PORT}` },
		},
		{
			name: "inferred-type",
			testMatch: "inferred-type.spec.ts",
			use: { baseURL: `http://localhost:${INFERRED_TYPE_PORT}` },
		},
	],
	webServer: [
		{
			command: "pnpm run start",
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
		{
			command: "pnpm run start",
			url: `http://localhost:${TOKEN_REFERENCES_PORT}`,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
			env: {
				DTCG_EDITOR_TOKENS_DIR: "./e2e/fixtures/token-references",
				PORT: String(TOKEN_REFERENCES_PORT),
			},
		},
		{
			command: "pnpm run start",
			url: `http://localhost:${INFERRED_TYPE_PORT}`,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
			env: {
				DTCG_EDITOR_TOKENS_DIR: "./e2e/fixtures/inferred-type-tokens",
				PORT: String(INFERRED_TYPE_PORT),
			},
		},
	],
});
