const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
	getStagedFiles,
	formatStagedFiles,
	restageStagedFiles,
	main,
} = require("./format-staged.cjs");

/**
 * Records every call instead of touching a real git repo or Prettier
 * process, per this repo's Dependency Injection for I/O/Platform
 * Externalities testing convention.
 */
function fakeExec(results) {
	const calls = [];
	const exec = (command, args, options) => {
		calls.push({ command, args, options });
		const result = results.shift();
		if (result instanceof Error) {
			throw result;
		}
		return result ?? "";
	};
	return { exec, calls };
}

test("getStagedFiles parses NUL-delimited output, including filenames with spaces (AC-01, AC-02)", () => {
	const { exec } = fakeExec(["a.ts\0b c.ts\0"]);
	assert.deepEqual(getStagedFiles(exec), ["a.ts", "b c.ts"]);
});

test("getStagedFiles returns an empty array for empty stdout", () => {
	const { exec } = fakeExec([""]);
	assert.deepEqual(getStagedFiles(exec), []);
});

test("formatStagedFiles runs prettier on the given files", () => {
	const { exec, calls } = fakeExec([undefined]);
	formatStagedFiles(["a.ts", "b.ts"], exec);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].command, "npx");
	assert.deepEqual(calls[0].args, [
		"--no",
		"--",
		"prettier",
		"--ignore-unknown",
		"--write",
		"--",
		"a.ts",
		"b.ts",
	]);
});

test("formatStagedFiles does nothing when given no files", () => {
	const { exec, calls } = fakeExec([]);
	formatStagedFiles([], exec);
	assert.equal(calls.length, 0);
});

test("restageStagedFiles runs git add on the given files (AC-01)", () => {
	const { exec, calls } = fakeExec([undefined]);
	restageStagedFiles(["a.ts", "b.ts"], exec);
	assert.equal(calls.length, 1);
	assert.deepEqual(calls[0], {
		command: "git",
		args: ["add", "--", "a.ts", "b.ts"],
		options: { stdio: "inherit" },
	});
});

test("restageStagedFiles does nothing when given no files", () => {
	const { exec, calls } = fakeExec([]);
	restageStagedFiles([], exec);
	assert.equal(calls.length, 0);
});

test("main does nothing beyond the staged-files read when there are none staged (AC-02)", () => {
	const { exec, calls } = fakeExec([""]);
	main(exec);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].command, "git");
	assert.deepEqual(calls[0].args.slice(0, 2), ["diff", "--cached"]);
});

test("main reads staged files, formats them, then restages them, in that order (AC-01)", () => {
	const { exec, calls } = fakeExec(["a.ts\0", undefined, undefined]);
	main(exec);
	assert.equal(calls.length, 3);
	assert.deepEqual(calls[0].args.slice(0, 2), ["diff", "--cached"]);
	assert.equal(calls[1].args.includes("prettier"), true);
	assert.deepEqual(calls[2].args, ["add", "--", "a.ts"]);
});

test("main propagates a Prettier failure and never restages (AC-04)", () => {
	const prettierError = new Error("prettier: SyntaxError");
	const { exec, calls } = fakeExec(["a.ts\0", prettierError]);
	assert.throws(() => main(exec), /prettier: SyntaxError/);
	assert.equal(calls.length, 2);
	assert.equal(calls[1].args.includes("prettier"), true);
});
