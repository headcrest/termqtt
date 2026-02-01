import { createCliRenderer, getTreeSitterClient } from "@opentui/core";
import { createRoot } from "@opentui/react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "./src/app/App";

const ensureTreeSitterWorker = async () => {
  if (process.env.OTUI_TREE_SITTER_WORKER_PATH) return;

  const execDir = process.execPath ? path.dirname(process.execPath) : process.cwd();
  const bundledWorker = path.join(execDir, "parser.worker.js");
  if (await Bun.file(bundledWorker).exists()) {
    process.env.OTUI_TREE_SITTER_WORKER_PATH = bundledWorker;
    return;
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const devWorker = path.join(here, "node_modules", "@opentui", "core", "parser.worker.js");
  if (await Bun.file(devWorker).exists()) {
    process.env.OTUI_TREE_SITTER_WORKER_PATH = devWorker;
  }
};

await ensureTreeSitterWorker();
const renderer = await createCliRenderer({ exitOnCtrlC: true });
const treeSitter = getTreeSitterClient();
await treeSitter.initialize();
createRoot(renderer).render(<App />);
