import { createCliRenderer, getTreeSitterClient } from "@opentui/core";
import { createRoot } from "@opentui/react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, rm } from "node:fs/promises";
import readline from "node:readline/promises";
import { App } from "./src/app/App";
import { APP_VERSION } from "./src/version";
import { formatHelp, matchesPattern, parseArgs } from "./src/cli";
import { getConfigDir } from "./src/storage";

const ensureTreeSitterWorker = async () => {
  if (process.env.OTUI_TREE_SITTER_WORKER_PATH) return;

  const execDir = process.execPath ? path.dirname(process.execPath) : process.cwd();
  const bundledWorker = path.join(execDir, "parser.worker.js");
  if (await Bun.file(bundledWorker).exists()) {
    try {
      process.chdir(execDir);
    } catch {
      // ignore if chdir fails
    }
    process.env.OTUI_TREE_SITTER_WORKER_PATH = bundledWorker;
    const bundledWasm = path.join(execDir, "tree-sitter.wasm");
    if (await Bun.file(bundledWasm).exists()) {
      process.env.TREE_SITTER_WASM_PATH = bundledWasm;
    }
    return;
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const devWorker = path.join(here, "node_modules", "@opentui", "core", "parser.worker.js");
  if (await Bun.file(devWorker).exists()) {
    process.env.OTUI_TREE_SITTER_WORKER_PATH = devWorker;
  }
};

const { overrides, showHelp, showVersion, clearStorage } = parseArgs(Bun.argv.slice(2));

if (showVersion) {
  console.log(APP_VERSION);
  process.exit(0);
}

if (showHelp) {
  console.log(formatHelp(APP_VERSION));
  process.exit(0);
}

if (clearStorage.enabled) {
  const dir = getConfigDir();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const files = await readdir(dir).catch(() => [] as string[]);
  const targets = clearStorage.pattern
    ? files.filter((file) => matchesPattern(file, clearStorage.pattern || ""))
    : files;
  const label = clearStorage.pattern ? `matching '${clearStorage.pattern}'` : "in this directory";
  const answer = await rl.question(
    `This will delete ${targets.length} config file(s) ${label} in ${dir}. Proceed? [y/N] `,
  );
  rl.close();
  const ok = answer.trim().toLowerCase();
  if (ok !== "y" && ok !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }
  await Promise.all(targets.map((file) => rm(path.join(dir, file), { force: true })));
  console.log("Config files removed.");
  process.exit(0);
}

if (overrides.broker) process.env.TERMOTTQ_BROKER = overrides.broker;
if (overrides.port && Number.isFinite(overrides.port)) process.env.TERMOTTQ_PORT = String(overrides.port);
if (overrides.user !== undefined) process.env.TERMOTTQ_USER = overrides.user;
if (overrides.password !== undefined) process.env.TERMOTTQ_PASSWORD = overrides.password;
if (overrides.tls) process.env.TERMOTTQ_TLS = "true";
if (overrides.rootTopic) process.env.TERMOTTQ_ROOT_TOPIC = overrides.rootTopic;

await ensureTreeSitterWorker();
const renderer = await createCliRenderer({ exitOnCtrlC: true });
const treeSitter = getTreeSitterClient();
await treeSitter.initialize();
createRoot(renderer).render(<App />);
