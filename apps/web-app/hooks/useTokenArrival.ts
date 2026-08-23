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
 * Runs on mount, on every native `hashchange`, and after a click anywhere
 * on the page (matching against `TreeTokenNode`'s existing
 * `token-${key}-heading` id convention — the one stable, focusable element
 * every token row already has — rather than threading an
 * `isArrivalTarget` prop through every layer of the tree; `TokenBlock.tsx`
 * itself needs no change, only its CSS module gains the class this
 * applies).
 *
 * The click listener exists because a same-file fragment jump goes
 * through Next.js's own `<Link>`, which updates the URL via
 * `history.pushState` — *not* a real browser fragment navigation — so no
 * native `hashchange` event fires for it at all (confirmed against this
 * project's installed Next.js docs: "whenever Next.js uses the native
 * scrollIntoView() API, including hash fragment (#id) navigation").
 * `hashchange` alone would silently miss every same-file jump. The click
 * handler polls the hash across animation frames rather than checking
 * once: `pushState` here happens on Next's own post-click scheduling,
 * observed to land more than one frame after the click — a single rAF
 * recheck reads the hash before it has changed and misses the jump.
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

			// A native fragment navigation makes the browser auto-expand any
			// closed <details> ancestor of the target on its own. Next.js's
			// <Link> reaches this same-page jump via `history.pushState`
			// rather than a real fragment navigation, so that native reveal
			// never runs — this replicates it. Setting `.open` here is a
			// plain DOM mutation, not a React prop, so it doesn't conflict
			// with `<details>` staying uncontrolled.
			let ancestor = heading.closest("details");
			while (ancestor !== null) {
				ancestor.open = true;
				ancestor = ancestor.parentElement?.closest("details") ?? null;
			}

			heading.focus();
		}

		let lastHash = window.location.hash;
		const MAX_POLL_FRAMES = 30;
		function recheckHashAfterClick() {
			let framesChecked = 0;
			function poll() {
				if (window.location.hash !== lastHash) {
					lastHash = window.location.hash;
					handleArrival();
					return;
				}
				framesChecked += 1;
				if (framesChecked < MAX_POLL_FRAMES) {
					requestAnimationFrame(poll);
				}
			}
			requestAnimationFrame(poll);
		}

		handleArrival();
		window.addEventListener("hashchange", handleArrival);
		document.addEventListener("click", recheckHashAfterClick);
		return () => {
			window.removeEventListener("hashchange", handleArrival);
			document.removeEventListener("click", recheckHashAfterClick);
		};
	}, []);
}
