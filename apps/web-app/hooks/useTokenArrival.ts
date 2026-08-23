"use client";

import { useEffect, useRef } from "react";
import styles from "../components/TokenBlock/TokenBlock.module.css";
import { decodeTokenFragment } from "../lib/tokens/token-fragment.ts";

function pathKey(path: readonly string[]): string {
	return path.join(".");
}

/**
 * Handles what native `<details>` auto-expansion does not: matching the
 * URL fragment to the actual token element, moving focus to it, and
 * marking it as the arrival target (spec FR-014's "making clear which
 * token was navigated to"). Revealing collapsed ancestor groups and
 * scrolling into view are the browser's job (research.md §4/§5) — this
 * hook covers only the remainder.
 *
 * Runs on mount and on every `hashchange`, matching against
 * `TreeTokenNode`'s existing `token-${key}-heading` id convention (the
 * one stable, focusable element every token row already has) rather than
 * threading an `isArrivalTarget` prop through every layer of the tree —
 * `TokenBlock.tsx` itself needs no change; only its CSS module gains the
 * class this applies.
 *
 * A fragment naming a token that doesn't exist in this file is ignored —
 * the page renders normally, since a file can be edited or renamed
 * between the link being created and followed.
 */
export function useTokenArrival(): void {
	const previousTarget = useRef<HTMLElement | undefined>(undefined);

	useEffect(() => {
		function handleArrival() {
			if (previousTarget.current !== undefined) {
				previousTarget.current.classList.remove(styles.arrivalTarget ?? "");
				previousTarget.current = undefined;
			}

			const path = decodeTokenFragment(window.location.hash);
			if (path.length === 0) {
				return;
			}

			const heading = document.getElementById(`token-${pathKey(path)}-heading`);
			if (heading === null) {
				return;
			}

			const row = heading.closest("li");
			if (row instanceof HTMLElement) {
				row.classList.add(styles.arrivalTarget ?? "");
				previousTarget.current = row;
			}
			if (heading instanceof HTMLElement) {
				heading.focus();
			}
		}

		handleArrival();
		window.addEventListener("hashchange", handleArrival);
		return () => {
			window.removeEventListener("hashchange", handleArrival);
		};
	}, []);
}
