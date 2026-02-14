import { describe, expect, test } from "bun:test";
import { formatHelp, matchesPattern, parseArgs } from "../src/cli";

describe("parseArgs", () => {
  test("parses overrides and clear-storage", () => {
    const result = parseArgs(["-b", "host", "-P", "1883", "--clear-storage", "broker_*"]);
    expect(result.overrides.broker).toBe("host");
    expect(result.overrides.port).toBe(1883);
    expect(result.clearStorage.enabled).toBe(true);
    expect(result.clearStorage.pattern).toBe("broker_*");
  });

  test("parses tls and root topic", () => {
    const result = parseArgs(["--tls", "--root-topic", "a/#", "-u", "user", "-w", "pass"]);
    expect(result.overrides.tls).toBe(true);
    expect(result.overrides.rootTopic).toBe("a/#");
    expect(result.overrides.user).toBe("user");
    expect(result.overrides.password).toBe("pass");
  });

  test("parses clear-storage with equals", () => {
    const result = parseArgs(["--clear-storage=broker_*"]);
    expect(result.clearStorage.pattern).toBe("broker_*");
  });

  test("parses upgrade and yes", () => {
    const result = parseArgs(["--upgrade", "-y"]);
    expect(result.upgrade).toBe(true);
    expect(result.yes).toBe(true);
  });

  test("parses multiple root topics", () => {
    const result = parseArgs(["-r", "sensors/#", "-r", "devices/#", "-r", "alerts/#"]);
    expect(result.overrides.rootTopic).toBe("sensors/#");
    expect(result.overrides.extraTopics).toEqual(["devices/#", "alerts/#"]);
  });

  test("single root topic produces no extraTopics", () => {
    const result = parseArgs(["-r", "sensors/#"]);
    expect(result.overrides.rootTopic).toBe("sensors/#");
    expect(result.overrides.extraTopics).toBeUndefined();
  });
});

describe("matchesPattern", () => {
  test("matches glob patterns", () => {
    expect(matchesPattern("broker_localhost_1883_termqtt_filters.json", "broker_*_filters.json")).toBe(true);
  });
});

describe("formatHelp", () => {
  test("includes version", () => {
    expect(formatHelp("1.2.3")).toContain("v1.2.3");
  });
});
