import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
	cleanup();
});

// Radix primitives (Select, DropdownMenu, Popover, Dialog, Tabs, ...) call
// these browser APIs that jsdom doesn't implement — guarded so multiple
// component test files (and concurrent contributors) can rely on this file
// without redeclaring the same stub.
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
	// biome-ignore lint/suspicious/noExplicitAny: assigning a jsdom-only stub onto the global.
	(globalThis as any).ResizeObserver = ResizeObserverStub;
}
