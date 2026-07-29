import { dirname, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { err, fromThrowable, ok, type Result } from "neverthrow";
import { describeCause } from "../lib/config.ts";
import { TokensDirSchema } from "../lib/token-editors/define-config.ts";
import { nodeExistsSync, nodeWriteFileSync } from "../lib/platform/node-fs.ts";
import type { ExistsSync, WriteTextFileSync } from "../lib/platform/node-fs.ts";

const CONFIG_FILE_NAME = "dtcg-editor.config.mts";

/**
 * `define-config.ts`'s real, fixed location — always `../lib/token-editors/`
 * relative to *this* script file, regardless of `io.cwd`. The generated
 * config's `import` specifier is computed relative to where it's actually
 * written (`io.cwd`, potentially not `apps/web-app/` if this script is ever
 * invoked from elsewhere), not hardcoded — a fixed `"./lib/token-editors/..."`
 * string only happened to work when `io.cwd` was `apps/web-app/`.
 */
const DEFINE_CONFIG_PATH = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../lib/token-editors/define-config.ts",
);

function defineConfigImportSpecifierFrom(cwd: string): string {
	const relativePath = relative(cwd, DEFINE_CONFIG_PATH).split(sep).join("/");
	return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

const USAGE = `Usage: pnpm --filter web-app run init-config [options]

Scaffolds dtcg-editor.config.mts in the current working directory.

Options:
  --tokens-dir <path>  Path to your DTCG token files (skips the interactive prompt)
  --force, -f          Overwrite an existing config file without prompting
  --help, -h           Print this help message and exit

Examples:
  Interactive: pnpm --filter web-app run init-config
  Flag-driven: pnpm --filter web-app run init-config --tokens-dir ./tokens
`;

export interface InitConfigIO {
	argv: string[];
	cwd: string;
	input: NodeJS.ReadableStream;
	output: NodeJS.WritableStream;
	isTTY: boolean;
	existsSync: ExistsSync;
	writeFileSync: WriteTextFileSync;
}

function describeIssues(
	issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): string {
	return issues
		.map((issue) =>
			issue.path.length > 0
				? `${issue.path.join(".")}: ${issue.message}`
				: issue.message,
		)
		.join("; ");
}

/**
 * Injectable core of the `init-config` CLI: collects a `tokensDir` value
 * (interactively or via `--tokens-dir`), validates it against the exact
 * `TokensDirSchema` `defineConfig()` uses at startup, and writes
 * `dtcg-editor.config.mts` (calling `defineConfig({ tokensDir, extensions: [] })`)
 * to `io.cwd`. All real process I/O is passed in via `io` so this can be
 * driven end-to-end in tests without touching
 * `process.argv`/`process.stdin`/`process.stdout`.
 */
export async function runInitConfig(
	io: InitConfigIO,
): Promise<Result<string, string>> {
	let parsed;
	try {
		parsed = parseArgs({
			args: io.argv,
			options: {
				"tokens-dir": { type: "string" },
				force: { type: "boolean", short: "f" },
				help: { type: "boolean", short: "h" },
			},
			strict: true,
			allowPositionals: false,
		});
	} catch (cause) {
		return err(describeCause(cause));
	}

	const { values } = parsed;

	if (values.help === true) {
		return ok(USAGE);
	}

	const flagDriven = typeof values["tokens-dir"] === "string";

	if (!flagDriven && !io.isTTY) {
		return err(
			"tokensDir not provided and stdin is not a TTY; pass --tokens-dir <path> instead.",
		);
	}

	const configPath = join(io.cwd, CONFIG_FILE_NAME);
	const configExists = io.existsSync(configPath);

	let rl: ReturnType<typeof createInterface> | undefined;
	try {
		if (configExists) {
			if (flagDriven) {
				if (values.force !== true) {
					return err(
						`A config file already exists at ${configPath}. Pass --force to overwrite.`,
					);
				}
			} else {
				rl = createInterface({ input: io.input, output: io.output });
				const answer = await rl.question(
					`A config file already exists at ${configPath}. Overwrite? (y/N) `,
				);
				if (answer.trim().toLowerCase() !== "y") {
					return ok("No changes made.");
				}
			}
		}

		let tokensDir: string;
		if (flagDriven) {
			const result = TokensDirSchema.safeParse(values["tokens-dir"]);
			if (!result.success) {
				return err(describeIssues(result.error.issues));
			}
			tokensDir = result.data;
		} else {
			rl ??= createInterface({ input: io.input, output: io.output });
			for (;;) {
				const answer = await rl.question("Path to your DTCG token files: ");
				const result = TokensDirSchema.safeParse(answer);
				if (result.success) {
					tokensDir = result.data;
					break;
				}
				io.output.write(`${describeIssues(result.error.issues)}\n`);
			}
		}

		if (!io.existsSync(resolve(io.cwd, tokensDir))) {
			io.output.write(`Warning: "${tokensDir}" does not currently exist.\n`);
		}

		const content = `import { defineConfig } from "${defineConfigImportSpecifierFrom(io.cwd)}";

export default defineConfig({
	tokensDir: ${JSON.stringify(tokensDir)},
	extensions: [],
});
`;
		const writeConfig = fromThrowable(
			() => io.writeFileSync(configPath, content),
			(cause) =>
				`Could not write config file at "${configPath}": ${describeCause(cause)}`,
		);

		return writeConfig().map(() => `Wrote ${configPath}`);
	} finally {
		rl?.close();
	}
}

async function main(): Promise<void> {
	const result = await runInitConfig({
		argv: process.argv.slice(2),
		cwd: process.cwd(),
		input: process.stdin,
		output: process.stdout,
		isTTY: process.stdin.isTTY === true,
		existsSync: nodeExistsSync,
		writeFileSync: nodeWriteFileSync,
	});

	if (result.isErr()) {
		console.error(result.error);
		process.exit(1);
	}

	console.log(result.value);
	process.exit(0);
}

const invokedPath = process.argv[1];
if (
	invokedPath !== undefined &&
	import.meta.url === pathToFileURL(invokedPath).href
) {
	void main();
}
