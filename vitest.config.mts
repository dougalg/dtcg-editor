import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Design-system foundation + component CSS, shared by every a11y project so
// browser-mode tests render under the real cascade (see vitest.a11y-setup.ts).
const a11yStylesSetup = fileURLToPath(
	new URL("./vitest.a11y-setup.ts", import.meta.url),
);

/**
 * One root config aggregates every JSX-rendering package's Vitest projects
 * (`test.projects`, https://vitest.dev/guide/projects.html) so the whole
 * suite runs in a single process instead of one `vitest` process per
 * package. Each package still owns its own `setupFiles`/`include` scoped
 * via that project's `root`; `node:test`-based packages (token-core,
 * errors, etc.) are untouched and keep running via their own `test`
 * scripts outside this config.
 */
// `apps/web-app`'s wall-clock benchmarks assert hard time budgets (SC-010,
// SC-004). They must run with the machine to themselves — dozens of other
// test files scheduled concurrently onto the same cores can push a sample
// well past budget purely from scheduling contention. They get their own
// project pinned to a later `sequence.groupOrder` so they run alone after
// every default-group project finishes, and are excluded from the normal
// unit project below so they aren't also run under contention.
const BENCH_FILES = [
	"lib/tokens/reference-index.test.ts",
	// SC-004: filterCandidates + isCircularIfSelected over a 1,000-path
	// catalogue — `.bench.ts`, not `.test.ts` (per tasks.md T047), so it's
	// named explicitly here rather than picked up by the unit project's
	// `**/*.test.ts` glob.
	"lib/tokens/candidate-filter.bench.ts",
];

function unitProject(pkgRoot: string) {
	return {
		root: pkgRoot,
		plugins: [react()],
		test: {
			name: `${pkgRoot}:unit`,
			environment: "jsdom",
			// Resolved relative to `root` — each package owns its own
			// `vitest.setup.ts` so `@testing-library/react` resolves from
			// that package's own node_modules, not the repo root's.
			setupFiles: ["./vitest.setup.ts"],
			// `.test.tsx` is components; `.test.ts` is everything else that
			// still imports from "vitest" (hooks, lib) — both belong here.
			// `token-editor-color`'s handful of `node:test`-based `.test.ts`
			// files are excluded by name since they run via that package's
			// own `test` script instead, matching this file's node:test
			// exception at the top.
			include: ["**/*.test.ts", "**/*.test.tsx"],
			exclude: [
				"**/*.a11y.test.tsx",
				"**/node_modules/**",
				"**/dist/**",
				// Runs in its own late-group project instead — see BENCH_FILES.
				// Relative to this project's `root`, so these only match inside
				// `apps/web-app` and are a harmless no-op for the others.
				...BENCH_FILES,
				// Relative to this project's own `root`, so these only ever
				// match inside `packages/token-editor-color` — harmless
				// (unmatched) globs for the other three projects.
				"src/configuration.test.ts",
				"src/utils/range-validation.test.ts",
				"src/utils/css-color.test.ts",
				"src/utils/conversion.test.ts",
				"src/utils/format-channel.test.ts",
			],
		},
	};
}

function a11yProject(pkgRoot: string) {
	return {
		root: pkgRoot,
		plugins: [react()],
		// cmdk (Command/Combobox) pulls its own React copy in browser mode
		// unless React is deduped here, surfacing as `useRef` of null at mount.
		resolve: { dedupe: ["react", "react-dom"] },
		optimizeDeps: { include: ["cmdk"] },
		// See apps/web-app's prior standalone config: next/link reads
		// `process.env.__NEXT_ROUTER_BASEPATH` at module scope, which needs a
		// defined (if empty) `process.env` when running in a real browser with
		// no Node `process` global.
		define: {
			"process.env": {},
		},
		test: {
			name: `${pkgRoot}:a11y`,
			setupFiles: [a11yStylesSetup, "./vitest.setup.ts"],
			include: ["**/*.a11y.test.tsx"],
			exclude: ["**/node_modules/**", "**/dist/**"],
			browser: {
				enabled: true,
				provider: playwright(),
				// Vitest's browser-mode headless default is CI-only (false
				// locally), so this pins it explicitly — otherwise every local
				// `pnpm test:vitest` pops a real Chromium window. Override with
				// `pnpm test:vitest:headed`.
				headless: true,
				instances: [{ browser: "chromium" }],
			},
			// Every package's a11y project would otherwise share groupOrder 0
			// with every unit project, so a full run launches all four jsdom
			// unit projects AND four real headless-Chromium instances at once —
			// on an 8-core/16GB machine that's enough contention to blow past
			// the browser-mode iframe-ready handshake (hard import/timeout
			// failures, not just slow ones). Runs after all unit projects
			// finish instead; bench (groupOrder 2) still runs last, alone.
			sequence: { groupOrder: 1 },
		},
	};
}

// Isolated project for the wall-clock-sensitive reference-index benchmark.
// `sequence.groupOrder: 2` makes it run on its own, after every unit (0) and
// a11y (1) project has finished, so no other test files — jsdom or real
// Chromium instances — are competing for the CPU while it measures.
function benchProject(pkgRoot: string) {
	return {
		root: pkgRoot,
		plugins: [react()],
		test: {
			name: `${pkgRoot}:bench`,
			environment: "jsdom",
			setupFiles: ["./vitest.setup.ts"],
			include: BENCH_FILES,
			exclude: ["**/node_modules/**", "**/dist/**"],
			sequence: { groupOrder: 2 },
		},
	};
}

const packages = [
	"apps/web-app",
	"packages/design-system",
	"packages/token-editor-border",
	"packages/token-editor-color",
	"packages/token-editor-cubic-bezier",
	"packages/token-editor-dimension",
	"packages/token-editor-duration",
	"packages/token-editor-font-family",
	"packages/token-editor-font-weight",
	"packages/token-editor-stroke-style",
];

export default defineConfig({
	test: {
		projects: [
			...packages.flatMap((root) => [unitProject(root), a11yProject(root)]),
			benchProject("apps/web-app"),
		],
	},
});
