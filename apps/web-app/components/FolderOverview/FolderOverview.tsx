import Link from "next/link";
import type { TokenFileSummary } from "../../lib/tokens/scan.ts";
import styles from "./FolderOverview.module.css";

function hrefFor(relativePath: string): string {
	return `/tokens/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function FolderOverview({
	files,
}: {
	files: readonly TokenFileSummary[];
}) {
	if (files.length === 0) {
		return (
			<p className={styles.empty}>
				No .json files found in the configured token directory.
			</p>
		);
	}

	return (
		<ul className={styles.list}>
			{files.map((file) => (
				<li key={file.relativePath} className={styles.item}>
					{file.valid ? (
						<Link href={hrefFor(file.relativePath)} className={styles.link}>
							<span className={styles.badgeValid}>valid</span>
							{!file.standard && (
								<span className={styles.badgeNonStandard}>non-standard</span>
							)}
							{file.relativePath}
						</Link>
					) : (
						<div className={styles.invalidItem}>
							<span className={styles.badgeInvalid}>invalid</span>
							{file.relativePath}
							<p className={styles.error}>{file.error}</p>
						</div>
					)}
				</li>
			))}
		</ul>
	);
}
