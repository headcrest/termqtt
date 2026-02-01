import path from "node:path";
import { mkdir, rm } from "node:fs/promises";

const platformMap: Record<string, string> = {
  darwin: "macos",
  linux: "linux",
  win32: "windows",
};

const archMap: Record<string, string> = {
  x64: "x64",
  arm64: "arm64",
};

const platform = platformMap[process.platform] ?? process.platform;
const arch = archMap[process.arch] ?? process.arch;

const root = process.cwd();
const distDir = path.join(root, "dist");
const binaryName = `termqtt${process.platform === "win32" ? ".exe" : ""}`;
const binaryPath = path.join(distDir, binaryName);
const workerPath = path.join(root, "node_modules", "@opentui", "core", "parser.worker.js");
const zipName = `termqtt-${platform}-${arch}.zip`;
const zipPath = path.join(distDir, zipName);

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await Bun.$`bun build --compile ./index.tsx --outfile ${binaryPath}`;
await Bun.$`bun build ${workerPath} --target=bun --outdir ${distDir} --asset-naming=tree-sitter.[ext]`;
await Bun.$`zip -j ${zipPath} ${binaryPath} ${path.join(distDir, "parser.worker.js")} ${path.join(distDir, "tree-sitter.wasm")}`;

console.log(`Built ${zipName}`);
