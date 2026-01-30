export type FlattenedEntry = {
  path: string;
  value: unknown;
  type: string;
};

export const parseJson = (input: string): { ok: true; value: unknown } | { ok: false; error: string } => {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON" };
  }
};

export const prettyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const flattenJson = (value: unknown, prefix = ""): FlattenedEntry[] => {
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ path: prefix || "[]", value, type: "array" }];
    return value.flatMap((entry, index) => {
      const next = `${prefix}[${index}]`;
      return flattenJson(entry, next);
    });
  }

  if (isObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return [{ path: prefix || "{}", value, type: "object" }];
    return entries.flatMap(([key, entry]) => {
      const next = prefix ? `${prefix}.${key}` : key;
      return flattenJson(entry, next);
    });
  }

  const type = value === null ? "null" : typeof value;
  return [{ path: prefix || "value", value, type }];
};

export const formatValue = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
