import { describe, expect, test } from "bun:test";
import { createInitialState } from "../src/state";
import {
  getDetailsContent,
  getFirstLeafTopicPath,
  getPayloadEntries,
  getStatusLine,
  getTopicTreeEntries,
  getWatchOptions,
} from "../src/app/selectors";

describe("getStatusLine", () => {
  test("marks paused only when connected", () => {
    const state = createInitialState();
    state.connectionStatus = "connected";
    state.updatesPaused = true;
    state.searchQuery = "foo";
    state.excludeFilters = [{ pattern: "read", enabled: true }];
    const line = getStatusLine(state);
    expect(line.paused).toBe(true);
    expect(line.searchActive).toBe(true);
    expect(line.excludesActive).toBe(true);
  });
});

describe("getTopicTreeEntries", () => {
  test("filters topics by exclude pattern", () => {
    const state = createInitialState();
    state.topics = ["foo/read/a", "foo/write/b"];
    state.excludeFilters = [{ pattern: "read", enabled: true }];
    const result = getTopicTreeEntries(state);
    const paths = result.topicPaths.join(",");
    expect(paths.includes("read")).toBe(false);
    expect(paths.includes("write")).toBe(true);
  });

  test("supports wildcard exclude", () => {
    const state = createInitialState();
    state.topics = ["a/x/b", "a/y/b"];
    state.excludeFilters = [{ pattern: "a/+/b", enabled: true }];
    const result = getTopicTreeEntries(state);
    expect(result.topicPaths.length).toBe(0);
  });
});

describe("getFirstLeafTopicPath", () => {
  test("returns first leaf path", () => {
    const state = createInitialState();
    state.topics = ["b/c", "a/c", "a/b/d"];
    const leaf = getFirstLeafTopicPath(state, "a");
    expect(leaf).toBe("a/b/d");
  });
});

describe("getPayloadEntries", () => {
  test("returns error/raw for invalid json", () => {
    const entries = getPayloadEntries({
      topic: "t",
      payload: "{",
      error: "Invalid JSON",
      receivedAt: Date.now(),
    });
    expect(entries[0]?.path).toBe("error");
    expect(entries[1]?.path).toBe("raw");
  });
});

describe("getWatchOptions", () => {
  test("returns formatted values", () => {
    const state = createInitialState();
    state.watchlist = [{ topic: "t", path: "a" }];
    state.messages = {
      t: { topic: "t", payload: "{}", json: { a: 2 }, receivedAt: Date.now() },
    };
    const options = getWatchOptions(state);
    expect(options[0]?.description).toBe("2");
  });
});

describe("getDetailsContent", () => {
  test("returns pretty json when available", () => {
    const content = getDetailsContent({
      topic: "t",
      payload: "{}",
      json: { a: 1 },
      receivedAt: Date.now(),
    });
    expect(content.isJson).toBe(true);
    expect(content.content).toContain("\"a\"");
  });
});
