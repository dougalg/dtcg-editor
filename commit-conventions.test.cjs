const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const commitlintBin = path.join(__dirname, "node_modules", ".bin", "commitlint");

/**
 * Runs the real commitlint CLI (same binary the commit-msg hook invokes)
 * against a message piped via stdin, since @commitlint/lint/@commitlint/load
 * aren't directly resolvable under pnpm's strict node_modules without adding
 * them as their own explicit dependencies.
 */
function lint(message) {
  try {
    execFileSync(commitlintBin, [], { input: message, stdio: ["pipe", "pipe", "pipe"] });
    return { ok: true };
  } catch (error) {
    // commitlint exits with status 1 specifically for a lint failure; any
    // other status (or no status at all, e.g. ENOENT) means the binary
    // itself didn't run correctly, which is a setup problem, not a result.
    if (error.status !== 1) {
      throw error;
    }
    return { ok: false, output: String(error.stdout ?? "") };
  }
}

test("rejects a malformed message (AC-01)", () => {
  const result = lint("this is not a conventional commit");
  assert.equal(result.ok, false);
});

test("rejects an out-of-enum type (AC-02)", () => {
  const result = lint("feature(token-core): add something");
  assert.equal(result.ok, false);
  assert.match(result.output, /type-enum/);
});

test("rejects an out-of-enum scope (AC-03)", () => {
  const result = lint("fix(random): correct a bug");
  assert.equal(result.ok, false);
  assert.match(result.output, /scope-enum/);
});

test("accepts a message with no scope (AC-03)", () => {
  const result = lint("fix: correct a bug with no scope specified");
  assert.equal(result.ok, true);
});

test("accepts a message with an allowed scope (AC-03)", () => {
  const result = lint("fix(token-core): correct a bug");
  assert.equal(result.ok, true);
});

test("accepts a well-formed valid message (AC-04)", () => {
  const result = lint("fix(token-core): correct $type inheritance edge case");
  assert.equal(result.ok, true);
});

test("accepts a breaking change signaled with '!' (AC-05)", () => {
  const result = lint("feat(token-core)!: change parseTokenFile's return type");
  assert.equal(result.ok, true);
});

test("accepts a breaking change signaled with a BREAKING CHANGE footer (AC-05)", () => {
  const result = lint(
    "feat(token-core): change parseTokenFile's return type\n\nBREAKING CHANGE: parseTokenFile now returns a Result instead of throwing.",
  );
  assert.equal(result.ok, true);
});
