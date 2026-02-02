import { describe, expect, test } from "bun:test";
import { buildPayloadFromRows, buildPreviewFromRows, parsePath } from "../src/dialogs/messageTable";

describe("parsePath", () => {
  test("normalizes whitespace", () => {
    expect(parsePath("foo . bar [ 0 ]")).toEqual(["foo", "bar", 0]);
  });
});

describe("buildPayloadFromRows", () => {
  test("merges shared prefixes", () => {
    const payload = buildPayloadFromRows(
      [
        { key: "foo.bar.fizz", value: "1" },
        { key: "foo.bar.fuzz", value: "2" },
      ],
      false,
    );
    expect(payload).toContain("fizz");
    expect(payload).toContain("fuzz");
  });

  test("supports array paths", () => {
    const payload = buildPayloadFromRows(
      [
        { key: "items[0].name", value: "\"a\"" },
        { key: "items[1].name", value: "\"b\"" },
      ],
      false,
    );
    expect(payload).toContain("items");
    expect(payload).toContain("\"a\"");
    expect(payload).toContain("\"b\"");
  });
});

describe("buildPreviewFromRows", () => {
  test("ignores parent when child exists", () => {
    const preview = buildPreviewFromRows(
      [
        { key: "foo.bar.buzz", value: "2" },
        { key: "foo.bar", value: "test" },
      ],
      false,
    );
    expect(preview).toContain("buzz");
    expect(preview).not.toContain("test");
  });

  test("returns empty string when no values", () => {
    const preview = buildPreviewFromRows([{ key: "foo", value: "" }], false);
    expect(preview).toBe("");
  });
});
