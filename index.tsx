import { createCliRenderer, getTreeSitterClient } from "@opentui/core";
import { createRoot } from "@opentui/react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "./src/app/App";
import { APP_VERSION } from "./src/version";

type CliOverrides = {
  broker?: string;
  port?: number;
  user?: string;
  password?: string;
  tls?: boolean;
  rootTopic?: string;
};

const parseArgs = () => {
  const args = Bun.argv.slice(2);
  const overrides: CliOverrides = {};
  let showHelp = false;
  let showVersion = false;

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

  return { overrides, showHelp, showVersion };
};

const printHelp = () => {
  const text = `termqtt v${APP_VERSION}

Usage:
  termqtt [options]

Options:
  -h, --help               Show help
  -v, --version            Show version
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

const { overrides, showHelp, showVersion } = parseArgs();

if (showVersion) {
  console.log(APP_VERSION);
  process.exit(0);
}

if (showHelp) {
  printHelp();
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
