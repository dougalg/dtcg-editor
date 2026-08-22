import { defineConfig } from "@sugarcube-sh/cli";

export default defineConfig({
	content: [
		"./**/*.{js,ts,jsx,tsx}",
		"../../apps/web-app/**/*.{js,ts,jsx,tsx}",
	],
	variables: {
		path: "dist/styles/tokens.css",
		prefix: "dtcg-ed",
		// Forces every variable (not just literally-differing ones) onto the
		// `[data-theme="dark"]` modifier selector below, so it's fully
		// self-contained and can't leave a stale light value on some
		// alias/dependent token. See specs/006-light-dark-toggle/research.md §1.
		propagateDependents: true,
		permutations: [
			// Base: light values, unconditional.
			{ input: { mode: "light" }, selector: ":root" },
			// The light/dark toggle sets `data-theme="dark"` on <html> for
			// *every* dark case — both an explicit override and "no override,
			// but the OS prefers dark" (the toggle's own JS resolves system
			// preference itself; see useTheme.ts) — so this is the only other
			// permutation needed. No `@media (prefers-color-scheme: dark)`
			// permutation and no `[data-theme="light"]` permutation: the
			// media-query version can't be overridden by an equal-specificity
			// attribute selector, and an explicit-light permutation would
			// resolve to literally the same values as the base `:root` above,
			// so sugarcube emits it as an empty rule — neither actually
			// works, so JS is the single source of truth for the attribute
			// instead. See specs/006-light-dark-toggle/research.md §1.
			{ input: { mode: "dark" }, selector: ':root[data-theme="dark"]' },
		],
	},
});
