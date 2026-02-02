import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAll, saveAll, saveJson, storageFiles, getBrokerPrefix } from "../src/storage";

const originalXdg = Bun.env.XDG_CONFIG_HOME;
let tempDir = "";

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "termqtt-test-"));
  Bun.env.XDG_CONFIG_HOME = tempDir;
});

afterAll(async () => {
  if (originalXdg) Bun.env.XDG_CONFIG_HOME = originalXdg;
  else delete Bun.env.XDG_CONFIG_HOME;
  await rm(tempDir, { recursive: true, force: true });
});

describe("getBrokerPrefix", () => {
  test("sanitizes host", () => {
    expect(getBrokerPrefix("mqtt.example.com", 1883)).toBe("broker_mqtt_example_com_1883_");
  });
});

describe("loadAll", () => {
  test("prefers scoped file and falls back to legacy", async () => {
    const legacyFavourites = [{ topic: "legacy" }];
    const scopedFavourites = [{ topic: "scoped" }];
    await saveJson(storageFiles.favourites, legacyFavourites);
    const prefix = getBrokerPrefix("localhost", 1883);
    await saveJson(`${prefix}${storageFiles.favourites}`, scopedFavourites);

    const loaded = await loadAll(
      {
        broker: { host: "localhost", port: 1883 } as any,
        favourites: [],
        watchlist: [],
        savedMessages: [],
        excludeFilters: [],
      },
      { host: "localhost", port: 1883 },
    );

    expect((loaded.favourites as any[])[0]?.topic).toBe("scoped");
  });
});

describe("saveAll", () => {
  test("writes scoped files", async () => {
    const prefix = getBrokerPrefix("localhost", 1883);
    await saveAll(
      {
        broker: { host: "localhost", port: 1883 } as any,
        favourites: [{ topic: "a" }],
        watchlist: [],
        savedMessages: [],
        excludeFilters: [],
      },
      { host: "localhost", port: 1883 },
    );
    const scoped = await Bun.file(join(tempDir, "termqtt", `${prefix}${storageFiles.favourites}`)).exists();
    expect(scoped).toBe(true);
  });
});
