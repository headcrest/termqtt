import { createCliRenderer, getTreeSitterClient } from "@opentui/core";
import { createRoot } from "@opentui/react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, rm } from "node:fs/promises";
import readline from "node:readline/promises";
import { App } from "./src/app/App";
import { APP_VERSION } from "./src/version";
import { getConfigDir } from "./src/storage";

type CliOverrides = {
  broker?: string;
  port?: number;
  user?: string;
  password?: string;
  tls?: boolean;
  rootTopic?: string;
};

type ClearStorageOptions = {
  enabled: boolean;
  pattern?: string;
};

const parseArgs = () => {
  const args = Bun.argv.slice(2);
  const overrides: CliOverrides = {};
  let showHelp = false;
  let showVersion = false;
  const clearStorage: ClearStorageOptions = { enabled: false };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === "--help" || arg === "-h") {
      showHelp = true;
      continue;
    }
    if (arg === "--version" || arg === "-v") {
      showVersion = true;
      continue;
    }
    if (arg === "--clear-storage") {
      clearStorage.enabled = true;
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        clearStorage.pattern = next;
        i += 1;
      }
      continue;
    }
    if (arg.startsWith("--clear-storage=")) {
      clearStorage.enabled = true;
      clearStorage.pattern = arg.split("=").slice(1).join("=") || undefined;
      continue;
    }
    if (arg === "--tls" || arg === "-t") {
      overrides.tls = true;
      continue;
    }

    const next = args[i + 1];
    if (arg === "--broker" || arg === "-b") {
      if (next) overrides.broker = next;
      i += 1;
      continue;
    }
    if (arg === "--port" || arg === "-P") {
      if (next) overrides.port = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--user" || arg === "-u") {
      if (next) overrides.user = next;
      i += 1;
      continue;
    }
    if (arg === "--password" || arg === "-w") {
      if (next) overrides.password = next;
      i += 1;
      continue;
    }
    if (arg === "--root-topic" || arg === "-r") {
      if (next) overrides.rootTopic = next;
      i += 1;
      continue;
    }
  }

  return { overrides, showHelp, showVersion, clearStorage };
};

const printHelp = () => {
  const text = `termqtt v${APP_VERSION}

Usage:
  termqtt [options]

Options:
  -h, --help               Show help
  -v, --version            Show version
  --clear-storage [glob]   Delete local config files (optional glob)
  -b, --broker <host>      Broker host
  -P, --port <port>        Broker port
  -u, --user <user>        Username
  -w, --password <pass>    Password
  -t, --tls                Enable TLS
  -r, --root-topic <topic> Root topic (subscribe filter)

Examples:
  termqtt -b localhost -P 1883 -r sensors/#
  termqtt --broker mqtt.example.com --tls --user alice --password secret -r devices/#
`;
  console.log(text);
};

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

const { overrides, showHelp, showVersion, clearStorage } = parseArgs();

if (showVersion) {
  console.log(APP_VERSION);
  process.exit(0);
}

if (showHelp) {
  printHelp();
  process.exit(0);
}

const matchesPattern = (name: string, pattern: string) => {
  const escaped = pattern.replace(/([.+^=!:${}()|[\]\\])/g, "\\$1");
  const regex = new RegExp(`^${escaped.replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
  return regex.test(name);
};

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
