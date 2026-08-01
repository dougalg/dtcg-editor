import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { WCAG_22_AA_TAGS } from "../../lib/a11y/wcag-tags.ts";

const axeSource = readFileSync(
	fileURLToPath(import.meta.resolve("axe-core/axe.min.js")),
	"utf-8",
);

/** Injects `axe-core` into `page` and runs it against the full document, scoped to {@link WCAG_22_AA_TAGS}. */
export async function runAxe(page: Page) {
	await page.addScriptTag({ content: axeSource });
	return page.evaluate(
		(tags) =>
			(
				window as unknown as {
					axe: {
						run: (
							context: Document,
							options: unknown,
						) => Promise<{ violations: unknown[] }>;
					};
				}
			).axe.run(document, { runOnly: { type: "tag", values: tags } }),
		[...WCAG_22_AA_TAGS],
	);
}
