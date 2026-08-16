import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { exitOnFatalStartupError } from "./fatal-startup-error.ts";

test("logs the fatal message and exits with code 1", () => {
	const exitSpy = vi
		.spyOn(process, "exit")
		.mockImplementation(() => undefined as never);
	const errorSpy = vi
		.spyOn(console, "error")
		.mockImplementation(() => undefined);

	try {
		exitOnFatalStartupError("boom");

		assert.equal(errorSpy.mock.calls.length, 1);
		assert.equal(
			errorSpy.mock.calls[0]?.[0],
			"[dtcg-editor] Fatal startup error: boom",
		);
		assert.equal(exitSpy.mock.calls.length, 1);
		assert.equal(exitSpy.mock.calls[0]?.[0], 1);
	} finally {
		exitSpy.mockRestore();
		errorSpy.mockRestore();
	}
});
