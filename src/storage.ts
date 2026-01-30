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

export const saveJson = async (fileName: string, data: unknown) => {
  const dir = await ensureConfigDir();
  const path = join(dir, fileName);
  await Bun.write(path, JSON.stringify(data, null, 2));
};
