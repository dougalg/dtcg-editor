import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { err, fromThrowable, ok, type Result } from "neverthrow";
import { CONFIG_FILE_NAME, ConfigFileSchema, describeCause } from "../lib/config.ts";
import { nodeExistsSync, nodeWriteFileSync } from "../lib/platform/node-fs.ts";
import type { ExistsSync, WriteTextFileSync } from "../lib/platform/node-fs.ts";

const USAGE = `Usage: pnpm --filter web-app run init-config [options]

Scaffolds dtcg-editor.config.json in the current working directory.

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

function describeIssues(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>): string {
  return issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}

/**
 * Injectable core of the `init-config` CLI: collects a `tokensDir` value
 * (interactively or via `--tokens-dir`), validates it against the exact
 * `ConfigFileSchema` `loadConfig()` uses at startup, and writes
 * `dtcg-editor.config.json` to `io.cwd`. All real process I/O is passed in
 * via `io` so this can be driven end-to-end in tests without touching
 * `process.argv`/`process.stdin`/`process.stdout`.
 */
export async function runInitConfig(io: InitConfigIO): Promise<Result<string, string>> {
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
    return err("tokensDir not provided and stdin is not a TTY; pass --tokens-dir <path> instead.");
  }

  const configPath = join(io.cwd, CONFIG_FILE_NAME);
  const configExists = io.existsSync(configPath);

  let rl: ReturnType<typeof createInterface> | undefined;
  try {
    if (configExists) {
      if (flagDriven) {
        if (values.force !== true) {
          return err(`A config file already exists at ${configPath}. Pass --force to overwrite.`);
        }
      } else {
        rl = createInterface({ input: io.input, output: io.output });
        const answer = await rl.question(`A config file already exists at ${configPath}. Overwrite? (y/N) `);
        if (answer.trim().toLowerCase() !== "y") {
          return ok("No changes made.");
        }
      }
    }

    let tokensDir: string;
    if (flagDriven) {
      const result = ConfigFileSchema.safeParse({ tokensDir: values["tokens-dir"] });
      if (!result.success) {
        return err(describeIssues(result.error.issues));
      }
      tokensDir = result.data.tokensDir;
    } else {
      rl ??= createInterface({ input: io.input, output: io.output });
      for (;;) {
        const answer = await rl.question("Path to your DTCG token files: ");
        const result = ConfigFileSchema.safeParse({ tokensDir: answer });
        if (result.success) {
          tokensDir = result.data.tokensDir;
          break;
        }
        io.output.write(`${describeIssues(result.error.issues)}\n`);
      }
    }

    if (!io.existsSync(resolve(io.cwd, tokensDir))) {
      io.output.write(`Warning: "${tokensDir}" does not currently exist.\n`);
    }

    const content = `${JSON.stringify({ tokensDir }, null, 2)}\n`;
    const writeConfig = fromThrowable(
      () => io.writeFileSync(configPath, content),
      (cause) => `Could not write config file at "${configPath}": ${describeCause(cause)}`,
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
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  void main();
}
