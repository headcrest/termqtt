import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR_NAME = "termqtt";

export const storageFiles = {
  broker: "termqtt_broker.json",
  watchlist: "termqtt_watchlist.json",
  favourites: "termqtt_favourites.json",
  savedMessages: "termqtt_saved_messages.json",
  filters: "termqtt_filters.json",
};

export const getConfigDir = () => {
  const xdg = Bun.env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim().length > 0) return join(xdg, CONFIG_DIR_NAME);
  return join(homedir(), ".config", CONFIG_DIR_NAME);
};

const ensureConfigDir = async () => {
  const dir = getConfigDir();
  await mkdir(dir, { recursive: true });
  return dir;
};

export const loadJson = async <T>(fileName: string, fallback: T): Promise<T> => {
  const dir = getConfigDir();
  const path = join(dir, fileName);
  const file = Bun.file(path);
  if (!(await file.exists())) return fallback;
  try {
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

export const hasBrokerConfig = async () => {
  const dir = getConfigDir();
  const path = join(dir, storageFiles.broker);
  const file = Bun.file(path);
  return file.exists();
};

export const saveJson = async (fileName: string, data: unknown) => {
  const dir = await ensureConfigDir();
  const path = join(dir, fileName);
  await Bun.write(path, JSON.stringify(data, null, 2));
};

const sanitizeKey = (value: string) => value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export const getBrokerPrefix = (host: string, port: number) => {
  const safeHost = sanitizeKey(host || "unknown");
  const safePort = Number.isFinite(port) ? String(port) : "unknown";
  return `broker_${safeHost}_${safePort}_`;
};

const scopedFile = (prefix: string, fileName: string) => `${prefix}${fileName}`;

export type PersistedState = {
  broker: unknown;
  favourites: unknown;
  watchlist: unknown;
  savedMessages: unknown;
  excludeFilters: unknown;
};

export const loadAll = async <T extends PersistedState>(
  fallback: T,
  brokerScope: { host: string; port: number },
): Promise<T> => {
  const prefix = getBrokerPrefix(brokerScope.host, brokerScope.port);
  const broker = await loadJson(storageFiles.broker, fallback.broker);
  const favourites = await loadJson(
    scopedFile(prefix, storageFiles.favourites),
    await loadJson(storageFiles.favourites, fallback.favourites),
  );
  const watchlist = await loadJson(
    scopedFile(prefix, storageFiles.watchlist),
    await loadJson(storageFiles.watchlist, fallback.watchlist),
  );
  const savedMessages = await loadJson(
    scopedFile(prefix, storageFiles.savedMessages),
    await loadJson(storageFiles.savedMessages, fallback.savedMessages),
  );
  const excludeFilters = await loadJson(
    scopedFile(prefix, storageFiles.filters),
    await loadJson(storageFiles.filters, fallback.excludeFilters),
  );
  return {
    ...fallback,
    broker,
    favourites,
    watchlist,
    savedMessages,
    excludeFilters,
  } as T;
};

export const saveAll = async (data: PersistedState, brokerScope: { host: string; port: number }) => {
  const prefix = getBrokerPrefix(brokerScope.host, brokerScope.port);
  await Promise.all([
    saveJson(storageFiles.broker, data.broker),
    saveJson(scopedFile(prefix, storageFiles.favourites), data.favourites),
    saveJson(scopedFile(prefix, storageFiles.watchlist), data.watchlist),
    saveJson(scopedFile(prefix, storageFiles.savedMessages), data.savedMessages),
    saveJson(scopedFile(prefix, storageFiles.filters), data.excludeFilters),
  ]);
};
