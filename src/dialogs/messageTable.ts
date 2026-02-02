export type TableRow = {
  key: string;
  value: string;
};

const normalizePath = (path: string) =>
  path
    .trim()
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s*\[\s*/g, "[")
    .replace(/\s*\]\s*/g, "]");

export const parseValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

export const parsePath = (path: string): Array<string | number> => {
  const tokens: Array<string | number> = [];
  const normalized = normalizePath(path);
  const pattern = /([^.[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null = pattern.exec(normalized);
  while (match) {
    if (match[1]) tokens.push(match[1]);
    if (match[2]) tokens.push(Number(match[2]));
    match = pattern.exec(normalized);
  }
  return tokens;
};

const setByTokens = (root: unknown, tokens: Array<string | number>, value: unknown) => {
  let current: any = root;
  let parent: any = null;
  let parentKey: string | number | null = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] as string | number;
    const isLast = i === tokens.length - 1;
    const nextToken = tokens[i + 1] as string | number | undefined;
    const shouldBeArray = typeof nextToken === "number";

    if (typeof token === "number") {
      if (!Array.isArray(current)) {
        const replacement: any[] = [];
        if (parent === null) {
          root = replacement;
        } else if (parentKey !== null) {
          parent[parentKey] = replacement;
        }
        current = replacement;
      }
      if (isLast) {
        current[token] = value;
        return root;
      }
      if (current[token] === undefined || typeof current[token] !== "object" || current[token] === null) {
        current[token] = shouldBeArray ? [] : {};
      }
      parent = current;
      parentKey = token;
      current = current[token];
      continue;
    }

    if (isLast) {
      current[token] = value;
      return root;
    }

    if (current[token] === undefined || typeof current[token] !== "object" || current[token] === null) {
      current[token] = shouldBeArray ? [] : {};
    }
    parent = current;
    parentKey = token;
    current = current[token];
  }

  return root;
};

export const buildPayloadFromRows = (rows: TableRow[], rawPayload: boolean) => {
  if (rawPayload && rows.length === 1 && rows[0]?.key === "payload") {
    return rows[0].value;
  }

  let root: unknown = undefined;
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    const tokens = parsePath(key);
    const value = parseValue(row.value);
    if (tokens.length === 0) {
      root = value;
      continue;
    }
    if (root === undefined) {
      root = typeof tokens[0] === "number" ? [] : {};
    }
    root = setByTokens(root, tokens, value);
  }

  return JSON.stringify(root ?? {}, null, 2);
};

export const buildPreviewFromRows = (rows: TableRow[], rawPayload: boolean) => {
  if (rawPayload && rows.length === 1 && rows[0]?.key === "payload") {
    return rows[0].value;
  }

  const normalizedKeys = rows
    .filter((row) => row.key.trim().length > 0 && row.value.trim().length > 0)
    .map((row) => row.key.trim());

  let root: unknown = undefined;
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    if (row.value.trim().length === 0) continue;
    if (normalizedKeys.some((other) => other !== key && (other.startsWith(`${key}.`) || other.startsWith(`${key}[`)))) {
      continue;
    }
    const tokens = parsePath(key);
    const value = parseValue(row.value);
    if (tokens.length === 0) {
      root = value;
      continue;
    }
    if (root === undefined) {
      root = typeof tokens[0] === "number" ? [] : {};
    }
    root = setByTokens(root, tokens, value);
  }

  return root === undefined ? "" : JSON.stringify(root, null, 2);
};
