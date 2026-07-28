import { expect, test } from "vitest";
import { TokenParseError } from "@dtcg-editor/token-core";
import type { UnknownError } from "@dtcg-editor/errors";
import { describePageError } from "./describe-error.ts";
import { FileNotFoundError } from "../../../lib/tokens/read.ts";
import { PathTraversalError } from "../../../lib/tokens/path-safety.ts";

test("PathTraversalError returns its own message (AC-02)", () => {
  const error = new PathTraversalError('Requested path ".." escapes the configured token directory');
  expect(describePageError(error, "../etc/passwd")).toBe(error.message);
});

test("FileNotFoundError returns its own message, not the generic fallback (AC-01, AC-02)", () => {
  const error = new FileNotFoundError('Token file not found: "missing.json"');
  expect(describePageError(error, "missing.json")).toBe(error.message);
});

test("TokenParseError returns its own message (AC-02)", () => {
  const error = new TokenParseError("Invalid DTCG token file: not valid JSON");
  expect(describePageError(error, "bad.json")).toBe(error.message);
});

test("UnknownError falls back to the generic message (AC-02)", () => {
  const error: UnknownError = { kind: "unknown", cause: new Error("boom") };
  expect(describePageError(error, "tokens.json")).toBe('Could not load "tokens.json".');
});
