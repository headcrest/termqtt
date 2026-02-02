import { describe, expect, test } from "bun:test";
import { flattenJson, formatValue, parseJson } from "../src/json";

describe("parseJson", () => {
  test("returns error for empty", () => {
    const result = parseJson("  ");
    expect(result.ok).toBe(false);
  });

  test("parses valid JSON", () => {
    const result = parseJson("{\"a\":1}");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ a: 1 });
  });

  test("strips null bytes", () => {
    const result = parseJson("\0{\"a\":1}");
    expect(result.ok).toBe(true);
  });
});

describe("flattenJson", () => {
  test("flattens objects and arrays", () => {
    const entries = flattenJson({ a: { b: 1 }, c: [true] });
    const paths = entries.map((entry) => entry.path).sort();
    expect(paths).toEqual(["a.b", "c[0]"].sort());
  });
});

describe("formatValue", () => {
  test("formats primitives", () => {
    expect(formatValue(1)).toBe("1");
    expect(formatValue(true)).toBe("true");
    expect(formatValue("x")).toBe("x");
  });

  test("formats objects", () => {
    expect(formatValue({ a: 1 })).toContain("\"a\"");
  });
});
