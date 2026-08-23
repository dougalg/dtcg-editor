import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * One root config aggregates every JSX-rendering package's Vitest projects
 * (`test.projects`, https://vitest.dev/guide/projects.html) so the whole
 * suite runs in a single process instead of one `vitest` process per
 * package. Each package still owns its own `setupFiles`/`include` scoped
 * via that project's `root`; `node:test`-based packages (token-core,
 * errors, etc.) are untouched and keep running via their own `test`
 * scripts outside this config.
 */
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
			include: ["**/*.test.tsx"],
			exclude: ["**/*.a11y.test.tsx", "**/node_modules/**", "**/dist/**"],
		},
	};
}

function a11yProject(pkgRoot: string) {
	return {
		root: pkgRoot,
		plugins: [react()],
		// See apps/web-app's prior standalone config: next/link reads
		// `process.env.__NEXT_ROUTER_BASEPATH` at module scope, which needs a
		// defined (if empty) `process.env` when running in a real browser with
		// no Node `process` global.
		define: {
			"process.env": {},
		},
		test: {
			name: `${pkgRoot}:a11y`,
			setupFiles: ["./vitest.setup.ts"],
			include: ["**/*.a11y.test.tsx"],
			exclude: ["**/node_modules/**", "**/dist/**"],
			browser: {
				enabled: true,
				provider: playwright(),
				instances: [{ browser: "chromium" }],
			},
		},
	};
}

const packages = [
	"apps/web-app",
	"packages/design-system",
	"packages/token-editor-color",
	"packages/token-editor-dimension",
];

export default defineConfig({
	test: {
		projects: packages.flatMap((root) => [
			unitProject(root),
			a11yProject(root),
		]),
	},
});
