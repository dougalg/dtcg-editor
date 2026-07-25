import { test } from "node:test";
import assert from "node:assert/strict";
import type { Logger } from "./logger.ts";
import { toLoggedUnknownError } from "./unknown-error.ts";

function fakeLogger(): { logger: Logger; calls: { obj: Record<string, unknown>; msg: string | undefined }[] } {
  const calls: { obj: Record<string, unknown>; msg: string | undefined }[] = [];
  return {
    logger: {
      error(obj, msg) {
        calls.push({ obj, msg });
      },
    },
    calls,
  };
}

test("constructs an UnknownError with the given cause and context", () => {
  const { logger } = fakeLogger();
  const cause = new Error("boom");

  const error = toLoggedUnknownError(logger, cause, "some-operation");

  assert.equal(error.kind, "unknown");
  assert.equal(error.cause, cause);
  assert.equal(error.context, "some-operation");
});

test("omits context entirely when not given", () => {
  const { logger } = fakeLogger();

  const error = toLoggedUnknownError(logger, "boom");

  assert.equal("context" in error, false);
});

test("logs exactly once, synchronously, before returning", () => {
  const { logger, calls } = fakeLogger();

  toLoggedUnknownError(logger, new Error("boom"), "some-operation");

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.obj["context"], "some-operation");
});
