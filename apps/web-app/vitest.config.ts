import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				plugins: [react()],
				test: {
					name: "unit",
					environment: "jsdom",
					setupFiles: ["./vitest.setup.ts"],
					include: ["**/*.test.{ts,tsx}"],
					exclude: ["**/*.a11y.test.tsx", "**/node_modules/**"],
				},
			},
			{
				plugins: [react()],
				// `next/link`'s internals read `process.env.__NEXT_ROUTER_BASEPATH` etc.
				// at module scope; a real build inlines these via DefinePlugin, but this
				// project runs test code in an actual browser with no Node `process`
				// global, so replace `process.env` with an empty object at transform time.
				define: {
					"process.env": {},
				},
				test: {
					name: "a11y",
					setupFiles: ["./vitest.setup.ts"],
					include: ["**/*.a11y.test.tsx"],
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
