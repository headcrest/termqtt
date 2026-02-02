import { describe, expect, test } from "bun:test";
import { reducer } from "../src/app/reducer";
import { createInitialState } from "../src/state";

describe("reducer message handling", () => {
  test("ignores messages when paused", () => {
    const state = createInitialState();
    state.updatesPaused = true;
    const next = reducer(state, { type: "message", topic: "a", payload: "{}" });
    expect(next.messageCount).toBe(state.messageCount);
  });

  test("adds new topic and increments count", () => {
    const state = createInitialState();
    const next = reducer(state, { type: "message", topic: "a", payload: "{}" });
    expect(next.messageCount).toBe(state.messageCount + 1);
    expect(next.topics.includes("a")).toBe(true);
  });
});

describe("reducer status and subscription", () => {
  test("updates status and error", () => {
    const state = createInitialState();
    const next = reducer(state, { type: "status", status: "error", error: "fail" });
    expect(next.connectionStatus).toBe("error");
    expect(next.connectionError).toBe("fail");
  });

  test("updates subscription info", () => {
    const state = createInitialState();
    const next = reducer(state, { type: "subscription", filter: "a/#", info: "ok" });
    expect(next.lastSubscription).toBe("a/#");
    expect(next.subscriptionInfo).toBe("ok");
  });
});

describe("reducer hydrate", () => {
  test("merges state", () => {
    const state = createInitialState();
    const next = reducer(state, { type: "hydrate", data: { searchQuery: "foo" } });
    expect(next.searchQuery).toBe("foo");
  });
});
