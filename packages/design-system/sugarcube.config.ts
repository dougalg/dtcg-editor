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
		// dark permutations below, so each is fully self-contained and can't
		// leave a stale light value on some alias/dependent token. See
		// specs/006-light-dark-toggle/research.md §1.
		propagateDependents: true,
		permutations: [
			// Base: light values, unconditional.
			{ input: { mode: "light" }, selector: ":root" },
			// Pure-CSS OS-preference fallback, so dark no longer depends on
			// JS having run. `:not([data-theme="light"])` is what makes this
			// safe to pair with the attribute permutation below: an explicit
			// *light* override needs no rule of its own (sugarcube would
			// compile one to an empty rule anyway, since light resolves to
			// the same values as the base `:root`) — it simply excludes
			// itself here and lets the base `:root` win. See research.md §1.
			{
				input: { mode: "dark" },
				selector: ':root:not([data-theme="light"])',
				atRule: "@media (prefers-color-scheme: dark)",
			},
			// Explicit dark override, for when the OS prefers light.
			{ input: { mode: "dark" }, selector: ':root[data-theme="dark"]' },
		],
	},
});
