/**
 * Formats every file staged for the current commit with Prettier and
 * re-stages whatever it changes. Invoked by `.husky/pre-commit`.
 *
 * Git/Prettier calls go through an injected `exec` function so this
 * module's logic can be unit-tested without a real git repo or a real
 * Prettier invocation (see format-staged.test.cjs).
 */
const { execFileSync } = require("node:child_process");

function getStagedFiles(exec) {
	const output = exec(
		"git",
		["diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"],
		{ encoding: "utf8" },
	);
	return output.split("\0").filter((file) => file.length > 0);
}

/**
 * Prettier refuses to process a symlink passed explicitly on the command
 * line (it errors instead of following or skipping it), so staged symlinks
 * — e.g. the `.claude/skills/<name>` -> `.agents/skills/<name>` links this
 * repo uses — must be excluded before formatting. They're already staged
 * as-is and need no reformatting or re-adding.
 */
function filterFormattableFiles(files, exec) {
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
	return files.filter((file) => !symlinks.has(file));
}

function formatStagedFiles(files, exec) {
	if (files.length === 0) {
		return;
	}
	exec(
		"npx",
		["--no", "--", "prettier", "--ignore-unknown", "--write", "--", ...files],
		{ stdio: "inherit" },
	);
}

function restageStagedFiles(files, exec) {
	if (files.length === 0) {
		return;
	}
	exec("git", ["add", "--", ...files], { stdio: "inherit" });
}

function main(exec) {
	const files = getStagedFiles(exec);
	if (files.length === 0) {
		return;
	}
	const formattable = filterFormattableFiles(files, exec);
	formatStagedFiles(formattable, exec);
	restageStagedFiles(formattable, exec);
}

if (require.main === module) {
	try {
		main(execFileSync);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

module.exports = {
	getStagedFiles,
	filterFormattableFiles,
	formatStagedFiles,
	restageStagedFiles,
	main,
};
