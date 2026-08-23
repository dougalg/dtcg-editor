import assert from "node:assert/strict";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, test } from "vitest";
import { useTokenArrival } from "./useTokenArrival.ts";

function setHash(hash: string) {
	window.location.hash = hash;
}

function buildTokenRow(key: string): {
	li: HTMLLIElement;
	input: HTMLInputElement;
} {
	const li = document.createElement("li");
	const input = document.createElement("input");
	input.id = `token-${key}-heading`;
	li.appendChild(input);
	document.body.appendChild(li);
	return { li, input };
}

beforeEach(() => {
	document.body.innerHTML = "";
	window.location.hash = "";
});

afterEach(() => {
	document.body.innerHTML = "";
	window.location.hash = "";
});

test("moves focus to the arrival target's heading input on mount", () => {
	const { input } = buildTokenRow("color.brand.blue");
	setHash("#color.brand.blue");

	renderHook(() => useTokenArrival());

	assert.equal(document.activeElement, input);
});

test("marks the arrival target's row with the arrivalTarget class", () => {
	const { li } = buildTokenRow("color.brand.blue");
	setHash("#color.brand.blue");

	renderHook(() => useTokenArrival());

	assert.equal(li.className.length > 0, true);
});

test("does nothing for an unknown fragment — the page stays usable", () => {
	buildTokenRow("color.brand.blue");
	setHash("#color.does.not.exist");

	renderHook(() => useTokenArrival());

	assert.equal(document.activeElement?.tagName, "BODY");
});

test("does nothing when there is no fragment at all", () => {
	buildTokenRow("color.brand.blue");
	setHash("");

	renderHook(() => useTokenArrival());

	assert.equal(document.activeElement?.tagName, "BODY");
});

test("re-runs on hashchange, moving focus and marking to the new target", () => {
	const { input: first } = buildTokenRow("color.a");
	const { input: second, li: secondLi } = buildTokenRow("color.b");
	setHash("#color.a");

	renderHook(() => useTokenArrival());
	assert.equal(document.activeElement, first);

	act(() => {
		setHash("#color.b");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});

	assert.equal(document.activeElement, second);
	assert.equal(secondLi.className.length > 0, true);
});

test("clears the previous arrival mark when navigating to a new target", () => {
	const { li: firstLi } = buildTokenRow("color.a");
	buildTokenRow("color.b");
	setHash("#color.a");

	renderHook(() => useTokenArrival());
	const markedClass = firstLi.className;
	assert.equal(markedClass.length > 0, true);

	act(() => {
		setHash("#color.b");
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});

	assert.equal(firstLi.className.includes(markedClass), false);
});
