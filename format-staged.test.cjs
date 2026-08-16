const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
	getStagedFiles,
	filterFormattableFiles,
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

test("filterFormattableFiles excludes staged symlinks (git ls-files mode 120000)", () => {
	const { exec, calls } = fakeExec([
		"120000 abc123 0\t.claude/skills/pick-up-task\x00100644 def456 0\ta.ts\0",
	]);
	const result = filterFormattableFiles(
		[".claude/skills/pick-up-task", "a.ts"],
		exec,
	);
	assert.deepEqual(result, ["a.ts"]);
	assert.equal(calls[0].command, "git");
	assert.deepEqual(calls[0].args, [
		"ls-files",
		"-s",
		"-z",
		"--",
		".claude/skills/pick-up-task",
		"a.ts",
	]);
});

test("filterFormattableFiles does nothing when given no files", () => {
	const { exec, calls } = fakeExec([]);
	assert.deepEqual(filterFormattableFiles([], exec), []);
	assert.equal(calls.length, 0);
});

test("formatStagedFiles runs biome check --write on the given files", () => {
	const { exec, calls } = fakeExec([undefined]);
	formatStagedFiles(["a.ts", "b.ts"], exec);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].command, "npx");
	assert.deepEqual(calls[0].args, [
		"--no",
		"--",
		"biome",
		"check",
		"--write",
		"--files-ignore-unknown=true",
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

test("main reads staged files, filters out symlinks, formats, then restages, in that order (AC-01)", () => {
	const { exec, calls } = fakeExec([
		"a.ts\0",
		"100644 def456 0\ta.ts\0",
		undefined,
		undefined,
	]);
	main(exec);
	assert.equal(calls.length, 4);
	assert.deepEqual(calls[0].args.slice(0, 2), ["diff", "--cached"]);
	assert.deepEqual(calls[1].args.slice(0, 2), ["ls-files", "-s"]);
	assert.equal(calls[2].args.includes("biome"), true);
	assert.deepEqual(calls[3].args, ["add", "--", "a.ts"]);
});

test("main skips biome and restaging entirely when every staged file is a symlink", () => {
	const { exec, calls } = fakeExec(["link\0", "120000 abc123 0\tlink\0"]);
	main(exec);
	assert.equal(calls.length, 2);
	assert.deepEqual(calls[0].args.slice(0, 2), ["diff", "--cached"]);
	assert.deepEqual(calls[1].args.slice(0, 2), ["ls-files", "-s"]);
});

test("main propagates a Biome failure and never restages (AC-04)", () => {
	const biomeError = new Error("biome: SyntaxError");
	const { exec, calls } = fakeExec([
		"a.ts\0",
		"100644 def456 0\ta.ts\0",
		biomeError,
	]);
	assert.throws(() => main(exec), /biome: SyntaxError/);
	assert.equal(calls.length, 3);
	assert.equal(calls[2].args.includes("biome"), true);
});
