import { createCliRenderer, getTreeSitterClient } from "@opentui/core";
import { createRoot } from "@opentui/react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chmod, copyFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
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

const { overrides, showHelp, showVersion, clearStorage, upgrade, yes } = parseArgs(Bun.argv.slice(2));

if (showVersion) {
  console.log(APP_VERSION);
  process.exit(0);
}

if (showHelp) {
  console.log(formatHelp(APP_VERSION));
  process.exit(0);
}

const parseVersion = (value: string) => value.replace(/^v/, "").split(".").map((part) => Number(part) || 0);

const compareVersions = (left: string, right: string) => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const resolveAssetName = () => {
  const osMap: Record<string, string> = {
    darwin: "macos",
    linux: "linux",
    win32: "windows",
  };
  const archMap: Record<string, string> = {
    x64: "x64",
    arm64: "arm64",
  };
  const os = osMap[process.platform] || process.platform;
  const arch = archMap[process.arch] || process.arch;
  return `termqtt-${os}-${arch}.zip`;
};

const performUpgrade = async () => {
  const response = await fetch("https://api.github.com/repos/headcrest/termqtt/releases/latest", {
    headers: { "User-Agent": "termqtt" },
  });
  if (!response.ok) {
    throw new Error(`Failed to check releases: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { tag_name: string; assets: Array<{ name: string; browser_download_url: string }> };
  const latest = data.tag_name || "";
  if (!latest) throw new Error("No release tag found");
  if (compareVersions(latest, APP_VERSION) <= 0) {
    console.log(`Already up to date (v${APP_VERSION}).`);
    return;
  }
  const assetName = resolveAssetName();
  const asset = data.assets.find((entry) => entry.name === assetName);
  if (!asset) {
    throw new Error(`No asset found for ${assetName}`);
  }

  if (!yes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Upgrade to ${latest}? [y/N] `);
    rl.close();
    const ok = answer.trim().toLowerCase();
    if (ok !== "y" && ok !== "yes") {
      console.log("Aborted.");
      return;
    }
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "termqtt-upgrade-"));
  const zipPath = path.join(tempDir, assetName);
  const zipResponse = await fetch(asset.browser_download_url);
  if (!zipResponse.ok) {
    throw new Error(`Failed to download ${assetName}: ${zipResponse.statusText}`);
  }
  await Bun.write(zipPath, await zipResponse.arrayBuffer());

  const unpacked = path.join(tempDir, "unpacked");
  if (process.platform === "win32") {
    await Bun.$`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${unpacked}' -Force"`;
  } else {
    await Bun.$`unzip -oq ${zipPath} -d ${unpacked}`;
  }

  const execDir = process.execPath ? path.dirname(process.execPath) : process.cwd();
  const execName = path.basename(process.execPath || "termqtt");
  const nextBinaryName = execName.startsWith("termqtt-bin")
    ? execName
    : process.platform === "win32"
      ? "termqtt.exe"
      : "termqtt";

  await copyFile(path.join(unpacked, process.platform === "win32" ? "termqtt.exe" : "termqtt"), path.join(execDir, nextBinaryName));
  await copyFile(path.join(unpacked, "parser.worker.js"), path.join(execDir, "parser.worker.js"));
  await copyFile(path.join(unpacked, "tree-sitter.wasm"), path.join(execDir, "tree-sitter.wasm"));

  if (process.platform !== "win32") {
    await chmod(path.join(execDir, nextBinaryName), 0o755);
  }

  console.log(`Upgraded to ${latest}.`);
};

if (upgrade) {
  try {
    await performUpgrade();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
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
if (overrides.extraTopics && overrides.extraTopics.length > 0) {
  process.env.TERMOTTQ_EXTRA_TOPICS = overrides.extraTopics.join(",");
}

await ensureTreeSitterWorker();
const renderer = await createCliRenderer({ exitOnCtrlC: true });
const treeSitter = getTreeSitterClient();
await treeSitter.initialize();
createRoot(renderer).render(<App />);
