import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

// The repo root is the directory that contains this `.storybook/` folder.
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const config: StorybookConfig = {
	stories: [
		"../packages/*/src/**/*.mdx",
		"../packages/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
	],
	addons: [
		getAbsolutePath("@storybook/addon-a11y"),
		getAbsolutePath("@storybook/addon-docs"),
	],
	framework: getAbsolutePath("@storybook/react-vite"),
	// Storybook's root is the repo root (stories span multiple packages),
	// so Vite's dev-server watcher would otherwise walk tooling/config
	// dotdirs too (.git, .claude, .agents, .specify, .turbo) - excluded
	// both for watcher overhead and because a broken symlink under any of
	// them (as .agents/archive-task once was) can crash the watcher with
	// ELOOP.
	//
	// These MUST be anchored to `repoRoot`, not written as floating
	// `**/.claude/**` globs: a git worktree for this repo lives under
	// `<main-checkout>/.claude/worktrees/<name>/`, so a floating
	// `**/.claude/**` matches every source file in that worktree and Vite
	// silently watches nothing - CSS/TSX edits never trigger HMR.
	async viteFinal(viteConfig) {
		viteConfig.server ??= {};
		viteConfig.server.watch ??= {};
		viteConfig.server.watch.ignored = [
			".git",
			".claude",
			".agents",
			".specify",
			".turbo",
		].map((d) => `${resolve(repoRoot, d)}/**`);
		return viteConfig;
	},
};
export default config;
