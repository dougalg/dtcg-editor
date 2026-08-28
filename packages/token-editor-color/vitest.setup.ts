import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
	cleanup();
});

// Radix primitives (Select, Dialog, ...) call browser APIs jsdom doesn't
// implement — matches packages/design-system/vitest.setup.ts.
if (!Element.prototype.hasPointerCapture) {
	Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
	Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
	Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = () => {};
}
if (!("ResizeObserver" in globalThis)) {
	class ResizeObserverStub {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	// biome-ignore lint/suspicious/noExplicitAny: jsdom-only stub onto the global.
	(globalThis as any).ResizeObserver = ResizeObserverStub;
}
