import Link from "next/link";
import { TokenTree } from "../../../components/TokenTree/TokenTree.tsx";
import { getConfig } from "../../../lib/config.ts";
import { loadTokenDirectory } from "../../../lib/tokens/load-directory.ts";
import type { PlainDtcgNode } from "../../../lib/tokens/plain-node.ts";
import { toPlainNode } from "../../../lib/tokens/plain-node.ts";
import { readAndParseTokenFile } from "../../../lib/tokens/read.ts";
import {
	buildReferenceIndex,
	buildReferenceView,
	type TokenReferenceView,
} from "../../../lib/tokens/reference-index.ts";
import { loadResolverModes } from "../../../lib/tokens/resolver-file.ts";
import { describePageError } from "./describe-error.ts";

interface PageProps {
	params: Promise<{ path: string[] }>;
}

/**
 * Builds the whole-directory reference index fresh, on every request, and
 * discards it once this file's slice is extracted — no cache, no
 * invalidation (research.md §2). Resolves to `undefined` on failure rather
 * than propagating it: resolved-value display and reference counts are an
 * enhancement over this page's core job of showing the requested file, so
 * a directory-wide read problem degrades to "no references shown" instead
 * of blocking the page `readAndParseTokenFile` above already succeeded at
 * loading.
 */
async function buildReferenceViewForFile(
	tokensDir: string,
	relativePath: string,
): Promise<TokenReferenceView | undefined> {
	const loaded = await loadTokenDirectory(tokensDir);
	if (loaded.isErr()) {
		return undefined;
	}
	const resolverModesResult = await loadResolverModes(tokensDir);
	const resolverModes = resolverModesResult.isOk()
		? resolverModesResult.value
		: undefined;
	const index = buildReferenceIndex(loaded.value.loaded, resolverModes);
	return buildReferenceView(index, relativePath);
}

export default async function TokenFilePage({ params }: PageProps) {
	const { path } = await params;
	const relativePath = path.join("/");
	const config = getConfig();

	let node: PlainDtcgNode | undefined;
	let errorMessage: string | undefined;

	const [result, referenceView] = await Promise.all([
		readAndParseTokenFile(config.tokensDir, relativePath),
		buildReferenceViewForFile(config.tokensDir, relativePath),
	]);
	if (result.isOk()) {
		node = toPlainNode(result.value.root, referenceView);
	} else {
		errorMessage = describePageError(result.error, relativePath);
	}

	return (
		<main className="wrapper page-wrapper">
			<p>
				<Link href="/">&larr; Back to folder overview</Link>
			</p>
			<h1>{relativePath}</h1>
			{node !== undefined ? (
				<TokenTree node={node} relativePath={relativePath} />
			) : (
				<p role="alert">{errorMessage}</p>
			)}
		</main>
	);
}
