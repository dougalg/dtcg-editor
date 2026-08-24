import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	applyInheritance,
	mergeDocuments,
	parse,
	parseResolver,
	resolveAliases,
	resolveResolver,
	validate,
} from "@styleframe/dtcg";

const fixturesDir = path.resolve(
	fileURLToPath(import.meta.url),
	"../../../../apps/web-app/e2e/fixtures/token-references",
);

async function readTokensFile(name: string) {
	const text = await readFile(path.join(fixturesDir, name), "utf-8");
	return parse(text);
}

// --- Example from the README: parse -> validate -> applyInheritance -> resolveAliases ---
async function runDocumentPipeline() {
	console.log(
		"\n=== parse / validate / applyInheritance / resolveAliases ===\n",
	);

	const [firstSource, ...restSources] = [
		"base.tokens.json",
		"semantic.tokens.json",
		"broken.tokens.json",
		"circular.tokens.json",
		"references-unparseable.tokens.json",
	];

	let merged = await readTokensFile(firstSource);
	for (const name of restSources) {
		merged = mergeDocuments(merged, await readTokensFile(name));
	}

	console.log("validate(mergedDoc):");
	console.log(validate(merged));

	const inherited = applyInheritance(merged);

	console.log("\nresolveAliases(inherited):");
	try {
		const resolved = resolveAliases(inherited);
		console.log(resolved);
	} catch (error) {
		console.log("threw:", error);
	}
}

// --- Example from the README: parseResolver -> resolve (resolveResolver) ---
async function runResolverPipeline() {
	console.log("\n=== parseResolver / resolveResolver ===\n");

	const resolverText = await readFile(
		path.join(fixturesDir, "tokens.resolver.json"),
		"utf-8",
	);
	const resolverDoc = parseResolver(resolverText);

	const fileLoader = async (ref: string) => {
		const text = await readFile(path.join(fixturesDir, ref), "utf-8");
		return JSON.parse(text);
	};

	for (const mode of ["light", "dark"]) {
		console.log(`\nresolveResolver(doc, { mode: "${mode}" }, fileLoader):`);
		try {
			const resolved = await resolveResolver(resolverDoc, { mode }, fileLoader);
			console.log(resolved);
		} catch (error) {
			console.log("threw:", error);
		}
	}
}

await runDocumentPipeline();
await runResolverPipeline();
