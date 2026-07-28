import Link from "next/link";
import { getConfig } from "../../../lib/config.ts";
import { readAndParseTokenFile } from "../../../lib/tokens/read.ts";
import { toPlainNode } from "../../../lib/tokens/plain-node.ts";
import type { PlainDtcgNode } from "../../../lib/tokens/plain-node.ts";
import { TokenTree } from "../../../components/TokenTree.tsx";
import { describePageError } from "./describe-error.ts";

interface PageProps {
	params: Promise<{ path: string[] }>;
}

export default async function TokenFilePage({ params }: PageProps) {
	const { path } = await params;
	const relativePath = path.join("/");
	const config = getConfig();

	let node: PlainDtcgNode | undefined;
	let errorMessage: string | undefined;

	const result = await readAndParseTokenFile(config.tokensDir, relativePath);
	if (result.isOk()) {
		node = toPlainNode(result.value.root);
	} else {
		errorMessage = describePageError(result.error, relativePath);
	}

	return (
		<main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
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
