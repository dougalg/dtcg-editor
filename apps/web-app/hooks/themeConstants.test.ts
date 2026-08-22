import { expect, test } from "vitest";
import { parseTheme } from "./themeConstants.ts";

/** `parseTheme` is the one place the server (`app/layout.tsx`, rendering
 * `data-theme` from the request's cookie) and the client (`useTheme.ts`,
 * reading `document.cookie`) agree on what a stored preference means, so a
 * disagreement here would show up as a hydration mismatch or a wrong first
 * paint. Both sides treat anything unrecognised as "no override", which is
 * the state that hands the page to `@media (prefers-color-scheme: dark)`. */

test("accepts the two real values", () => {
	expect(parseTheme("light")).toBe("light");
	expect(parseTheme("dark")).toBe("dark");
});

test("treats an absent cookie as no override", () => {
	expect(parseTheme(undefined)).toBeUndefined();
});

test.each([
	["", "an empty value"],
	["Dark", "the wrong case"],
	["dark ", "trailing whitespace"],
	["system", "a third state this app never writes"],
	["null", "a stringified null"],
	['{"theme":"dark"}', "a JSON blob"],
])("treats %j (%s) as no override", (raw) => {
	expect(parseTheme(raw)).toBeUndefined();
});
