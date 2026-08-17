import { defineConfig } from "@sugarcube-sh/cli";

export default defineConfig({
	content: [
		"./**/*.{js,ts,jsx,tsx}",
		"../../apps/web-app/**/*.{js,ts,jsx,tsx}",
	],
	variables: {
		path: "dist/styles/tokens.css",
		prefix: "dtcg-ed",
		permutations: [
			{ input: { mode: "light" }, selector: ":root" },
			{
				input: { mode: "dark" },
				selector: ":root",
				atRule: "@media (prefers-color-scheme: dark)",
			},
		],
	},
});
