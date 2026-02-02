import { afterEach, describe, expect, test } from "bun:test";
import { createInitialState, createStore } from "../src/state";

const original = {
  broker: Bun.env.TERMOTTQ_BROKER,
  port: Bun.env.TERMOTTQ_PORT,
  root: Bun.env.TERMOTTQ_ROOT_TOPIC,
  tls: Bun.env.TERMOTTQ_TLS,
};

afterEach(() => {
  if (original.broker !== undefined) Bun.env.TERMOTTQ_BROKER = original.broker;
  else delete Bun.env.TERMOTTQ_BROKER;
  if (original.port !== undefined) Bun.env.TERMOTTQ_PORT = original.port;
  else delete Bun.env.TERMOTTQ_PORT;
  if (original.root !== undefined) Bun.env.TERMOTTQ_ROOT_TOPIC = original.root;
  else delete Bun.env.TERMOTTQ_ROOT_TOPIC;
  if (original.tls !== undefined) Bun.env.TERMOTTQ_TLS = original.tls;
  else delete Bun.env.TERMOTTQ_TLS;
});

describe("createInitialState", () => {
  test("applies env overrides", () => {
    Bun.env.TERMOTTQ_BROKER = "example.com";
    Bun.env.TERMOTTQ_PORT = "8883";
    Bun.env.TERMOTTQ_ROOT_TOPIC = "root/#";
    Bun.env.TERMOTTQ_TLS = "true";
    const state = createInitialState();
    expect(state.broker.host).toBe("example.com");
    expect(state.broker.port).toBe(8883);
    expect(state.broker.topicFilter).toBe("root/#");
    expect(state.broker.defaultTopic).toBe("root/#");
    expect(state.broker.tls).toBe(true);
  });
});

describe("createStore", () => {
  test("setState updates state and notifies", () => {
    const store = createStore(createInitialState());
    let seen = "";
    const unsubscribe = store.subscribe((next) => {
      seen = next.searchQuery;
    });
    store.setState({ searchQuery: "hello" });
    expect(store.getState().searchQuery).toBe("hello");
    expect(seen).toBe("hello");
    unsubscribe();
  });

  test("updateState applies updater", () => {
    const store = createStore(createInitialState());
    store.updateState((current) => ({ ...current, messageCount: current.messageCount + 1 }));
    expect(store.getState().messageCount).toBe(1);
  });

  test("unsubscribe stops notifications", () => {
    const store = createStore(createInitialState());
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.setState({ searchQuery: "one" });
    unsubscribe();
    store.setState({ searchQuery: "two" });
    expect(calls).toBe(1);
  });
});
