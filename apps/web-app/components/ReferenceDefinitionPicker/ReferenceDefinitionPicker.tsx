"use client";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@dtcg-editor/design-system/components/Popover/Popover.tsx";
import Link from "next/link";
import type { ResolvedReference } from "../../lib/tokens/reference-index.ts";
import { tokenHref } from "../../lib/tokens/token-fragment.ts";
import styles from "./ReferenceDefinitionPicker.module.css";

function pathText(path: readonly string[]): string {
	return path.join(".");
}

/**
 * Shown in place of a direct link when a reference's target path has more
 * than one definition (spec FR-013) — never silently picks a winner. Each
 * option is labelled by file and mode; only outcomes that actually
 * resolved are activatable (FR-016 applies per outcome, not just to the
 * reference as a whole, since one mode can resolve while another fails).
 */
export function ReferenceDefinitionPicker({
	resolved,
}: {
	readonly resolved: ResolvedReference;
}) {
	const targetPathText = pathText(resolved.reference.targetPath);

	return (
		<Popover>
			<PopoverTrigger
				className={styles.trigger}
				aria-label={`Choose a definition of ${targetPathText} — ${resolved.outcomes.length} available`}
			>
				{resolved.reference.raw}
			</PopoverTrigger>
			<PopoverContent>
				<ul className={styles.list}>
					{resolved.outcomes.map((outcome) => {
						const key = `${outcome.mode ?? ""}:${outcome.targetFile ?? ""}`;
						const modeLabel =
							outcome.mode !== undefined ? (
								<span className={styles.mode}>{outcome.mode}: </span>
							) : null;

						if (
							outcome.chain.outcome.kind === "resolved" &&
							outcome.targetFile !== undefined
						) {
							return (
								<li key={key}>
									{modeLabel}
									<Link
										href={tokenHref(
											outcome.targetFile,
											resolved.reference.targetPath,
										)}
										aria-label={`Go to ${targetPathText} in ${outcome.targetFile}${
											outcome.mode !== undefined
												? ` (${outcome.mode} mode)`
												: ""
										}`}
									>
										{outcome.targetFile}
									</Link>
								</li>
							);
						}

						return (
							<li key={key} className={styles.unresolvable}>
								{modeLabel}
								unresolvable
							</li>
						);
					})}
				</ul>
			</PopoverContent>
		</Popover>
	);
}
