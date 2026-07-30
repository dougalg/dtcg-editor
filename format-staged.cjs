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
	formatStagedFiles(files, exec);
	restageStagedFiles(files, exec);
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
	formatStagedFiles,
	restageStagedFiles,
	main,
};
