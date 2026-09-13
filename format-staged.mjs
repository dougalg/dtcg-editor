/**
 * Formats and lints every file staged for the current commit with Biome and
 * re-stages whatever it changes. Invoked by `.husky/pre-commit`.
 *
 * Git/Biome calls go through an injected `exec` function so this
 * module's logic can be unit-tested without a real git repo or a real
 * Biome invocation (see format-staged.test.mjs).
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function getStagedFiles(exec) {
	const output = exec(
		"git",
		["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
		{ encoding: "utf8" },
	);
	return output.split("\0").filter((file) => file.length > 0);
}

/**
 * Staged symlinks — e.g. the `.claude/skills/<name>` -> `.agents/skills/<name>`
 * links this repo uses — are excluded before formatting. They're already
 * staged as-is and need no reformatting or re-adding.
 *
 * Markdown and YAML files are also excluded: Biome doesn't support either
 * language (Markdown formatting/linting is still "in progress" as of 2.5.8;
 * YAML isn't supported at all). Passing only unsupported-language paths to
 * `biome check` errors out entirely ("no files were processed") rather than
 * a silent no-op, so a commit touching only `.md`/`.yaml`/`.yml` files
 * (e.g. `pnpm-lock.yaml`, `pnpm-workspace.yaml`) would otherwise always
 * fail the hook.
 */
const UNSUPPORTED_EXTENSIONS = [".md", ".yaml", ".yml"];

export function filterFormattableFiles(files, exec) {
	if (files.length === 0) {
		return files;
	}
	const output = exec("git", ["ls-files", "-s", "-z", "--", ...files], {
		encoding: "utf8",
	});
	const symlinks = new Set();
	for (const entry of output.split("\0").filter((line) => line.length > 0)) {
		const [meta, path] = entry.split("\t");
		const mode = meta.split(" ")[0];
		if (mode === "120000") {
			symlinks.add(path);
		}
	}
	return files.filter(
		(file) =>
			!symlinks.has(file) &&
			!UNSUPPORTED_EXTENSIONS.some((ext) => file.endsWith(ext)),
	);
}

export function formatStagedFiles(files, exec) {
	if (files.length === 0) {
		return;
	}
	exec(
		"npx",
		[
			"--no",
			"--",
			"biome",
			"check",
			"--write",
			"--files-ignore-unknown=true",
			"--",
			...files,
		],
		{ stdio: "inherit" },
	);
}

export function restageStagedFiles(files, exec) {
	if (files.length === 0) {
		return;
	}
	exec("git", ["add", "--", ...files], { stdio: "inherit" });
}

export function main(exec) {
	const files = getStagedFiles(exec);
	if (files.length === 0) {
		return;
	}
	const formattable = filterFormattableFiles(files, exec);
	formatStagedFiles(formattable, exec);
	restageStagedFiles(formattable, exec);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		main(execFileSync);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}
