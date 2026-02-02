import { describe, expect, test } from "bun:test";
import { addFilter, buildFilterOptionName, deleteFilter, editFilter, toggleFilter } from "../src/dialogs/filtersLogic";

describe("filters logic", () => {
  test("buildFilterOptionName renders checkbox", () => {
    expect(buildFilterOptionName({ pattern: "read", enabled: true })).toBe("[x] read");
    expect(buildFilterOptionName({ pattern: "read", enabled: false })).toBe("[ ] read");
  });

  test("toggleFilter flips enabled", () => {
    const next = toggleFilter([{ pattern: "a", enabled: false }], 0);
    expect(next[0]?.enabled).toBe(true);
  });

  test("addFilter ignores empty", () => {
    const next = addFilter([], "");
    expect(next.length).toBe(0);
  });

  test("addFilter appends", () => {
    const next = addFilter([], "foo");
    expect(next[0]?.pattern).toBe("foo");
  });

  test("editFilter updates pattern", () => {
    const next = editFilter([{ pattern: "a", enabled: true }], 0, "b");
    expect(next[0]?.pattern).toBe("b");
  });

  test("deleteFilter removes entry", () => {
    const next = deleteFilter([{ pattern: "a", enabled: true }], 0);
    expect(next.length).toBe(0);
  });
});
