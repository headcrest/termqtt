import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyEvent, SelectOption } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { highlightJson } from "../ui/jsonHighlight";
import { jsonColors } from "../ui/jsonColors";
import { paneActiveBackground, paneInactiveBackground } from "../ui/paneTheme";
import { flattenJson, formatValue, parseJson } from "../json";
import type { SavedMessage } from "../state";
import { useDialog } from "./DialogContext";

type MessageDialogProps = {
  mode: "edit" | "new";
  initialTopic: string;
  initialPayload: string;
  savedMessages: SavedMessage[];
  onPublish: (topic: string, payload: string) => void;
  onSaveMessage: (name: string, topic: string, payload: string) => void;
  onDeleteSaved: (index: number) => void;
  onLoadSaved: (message: SavedMessage) => void;
};

type TableRow = {
  key: string;
  value: string;
};

const getValueColor = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return jsonColors.default;
  if (trimmed === "true" || trimmed === "false") return jsonColors.boolean;
  if (trimmed === "null") return jsonColors.null;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) return jsonColors.number;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return jsonColors.string;
  }
  return jsonColors.string;
};

const parsePayloadToRows = (payload: string) => {
  const parsed = parseJson(payload);
  if (!parsed.ok) {
    return { rows: [{ key: "payload", value: payload }], raw: true };
  }
  const flattened = flattenJson(parsed.value);
  if (flattened.length === 0) {
    return { rows: [{ key: "", value: "" }], raw: false };
  }
  if (
    flattened.length === 1 &&
    (flattened[0]?.path === "{}" || flattened[0]?.path === "[]")
  ) {
    return { rows: [{ key: "", value: "" }], raw: false };
  }
  return {
    rows: flattened.map((entry) => ({
      key: entry.path,
      value: entry.type === "string" ? String(entry.value ?? "") : formatValue(entry.value),
    })),
    raw: false,
  };
};

const parseValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const parsePath = (path: string): Array<string | number> => {
  const tokens: Array<string | number> = [];
  const pattern = /([^.[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null = pattern.exec(path);
  while (match) {
    if (match[1]) tokens.push(match[1]);
    if (match[2]) tokens.push(Number(match[2]));
    match = pattern.exec(path);
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
        } else {
          if (parentKey !== null) parent[parentKey] = replacement;
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

const buildPayloadFromRows = (rows: TableRow[], rawPayload: boolean) => {
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

export const MessageDialog = ({
  mode,
  initialTopic,
  initialPayload,
  savedMessages,
  onPublish,
  onSaveMessage,
  onDeleteSaved,
  onLoadSaved,
}: MessageDialogProps) => {
  const { closeDialog } = useDialog();
  const [topic, setTopic] = useState(initialTopic);
  const initialRows = useMemo(() => parsePayloadToRows(initialPayload), [initialPayload]);
  const [rows, setRows] = useState<TableRow[]>(initialRows.rows);
  const [rawPayload, setRawPayload] = useState(initialRows.raw);
  const [tableRow, setTableRow] = useState(0);
  const [tableColumn, setTableColumn] = useState<"key" | "value">("key");
  const [focus, setFocus] = useState<"topic" | "table" | "saved">("topic");
  const lastFocus = useRef(focus);
  const [status, setStatus] = useState("");
  const [savedIndex, setSavedIndex] = useState(0);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    if (tableRow >= rows.length) setTableRow(Math.max(0, rows.length - 1));
  }, [rows.length, tableRow]);

  useEffect(() => {
    if (focus === "table" && lastFocus.current !== "table") {
      if (rows.length === 0) {
        setRows([{ key: "", value: "" }]);
        setTableRow(0);
      } else {
        setTableRow((prev) => Math.min(Math.max(0, rows.length - 1), prev));
      }
      setTableColumn("key");
    }
    lastFocus.current = focus;
  }, [focus, rows.length]);

  const savedOptions: SelectOption[] = useMemo(
    () => savedMessages.map((msg) => ({ name: msg.name, description: msg.topic })),
    [savedMessages],
  );

  const previewPayload = useMemo(() => buildPayloadFromRows(rows, rawPayload), [rows, rawPayload]);
  const previewParsed = useMemo(() => parseJson(previewPayload), [previewPayload]);
  const previewContent = useMemo(() => {
    if (previewParsed.ok) return JSON.stringify(previewParsed.value, null, 2);
    return previewPayload;
  }, [previewParsed, previewPayload]);

  const isShiftTab = (key: KeyEvent) =>
    key.name === "backtab" || (key.name === "tab" && key.shift) || key.sequence === "\u001b[Z";
  const isTab = (key: KeyEvent) => key.name === "tab" || key.name === "teb" || key.sequence === "\t";

  const moveTableFocus = (direction: "next" | "prev") => {
    if (rows.length === 0) return;
    if (direction === "next") {
      if (tableColumn === "key") {
        setTableColumn("value");
        return;
      }
      if (tableRow < rows.length - 1) {
        setTableColumn("key");
        setTableRow((prev) => prev + 1);
        return;
      }
      setFocus("topic");
      return;
    }
    if (tableColumn === "value") {
      setTableColumn("key");
      return;
    }
    if (tableRow > 0) {
      setTableColumn("value");
      setTableRow((prev) => prev - 1);
      return;
    }
    setFocus("topic");
  };

  const addRow = () => {
    setRows((current) => [...current, { key: "", value: "" }]);
    setTableRow(rows.length);
    setTableColumn("key");
    setFocus("table");
  };

  const deleteRow = () => {
    if (rows.length === 0) return;
    setRows((current) => current.filter((_, idx) => idx !== tableRow));
    setTableRow((prev) => Math.max(0, prev - 1));
  };

  const updateRow = (index: number, patch: Partial<TableRow>) => {
    setRows((current) =>
      current.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    );
  };

  const loadPayloadRows = (payload: string) => {
    const parsed = parsePayloadToRows(payload);
    setRows(parsed.rows);
    setRawPayload(parsed.raw);
    setTableRow(0);
    setTableColumn("key");
  };

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (!key) return false;
      if (showSavePrompt) {
        if (key.name === "escape") {
          setShowSavePrompt(false);
          return true;
        }
        if (key.name === "return") {
          const name = saveName.trim();
          if (name) {
            const payload = buildPayloadFromRows(rows, rawPayload);
            onSaveMessage(name, topic.trim(), payload);
          }
          setShowSavePrompt(false);
          return true;
        }
        return false;
      }

      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (key.ctrl && key.name === "k") {
        if (focus === "topic") {
          setTopic("");
          return true;
        }
        if (focus === "table") {
          if (!rows[tableRow]) return true;
          if (tableColumn === "key") updateRow(tableRow, { key: "" });
          if (tableColumn === "value") updateRow(tableRow, { value: "" });
          return true;
        }
      }
      if (key.ctrl && key.name === "x") {
        setTopic("");
        setRows([{ key: "", value: "" }]);
        setRawPayload(false);
        setTableRow(0);
        setTableColumn("key");
        setStatus("");
        return true;
      }
      if (key.ctrl && key.name === "t") {
        setFocus("topic");
        return true;
      }
      if (key.ctrl && key.name === "s") {
        setSaveName("");
        setShowSavePrompt(true);
        return true;
      }
      if (key.ctrl && key.name === "l") {
        setFocus("saved");
        return true;
      }
      if (key.ctrl && key.name === "n") {
        addRow();
        return true;
      }
      if (key.ctrl && (key.name === "d" || key.name === "backspace")) {
        deleteRow();
        return true;
      }
      if (isTab(key) && !key.shift) {
        if (focus === "topic") {
          if (rows.length === 0) addRow();
          setFocus("table");
          setTableColumn("key");
          setTableRow(0);
          return true;
        }
        if (focus === "saved") {
          setFocus("topic");
          return true;
        }
        moveTableFocus("next");
        return true;
      }
      if (isShiftTab(key)) {
        if (focus === "topic") {
          setFocus("table");
          setTableColumn("value");
          setTableRow(Math.max(0, rows.length - 1));
          return true;
        }
        if (focus === "saved") {
          setFocus("table");
          setTableColumn("value");
          setTableRow(Math.max(0, rows.length - 1));
          return true;
        }
        moveTableFocus("prev");
        return true;
      }
      if (key.name === "return" && focus !== "saved") {
        if (!topic.trim()) {
          setStatus("Topic is required");
          return true;
        }
        const payload = buildPayloadFromRows(rows, rawPayload);
        if (!rawPayload) {
          const parsed = parseJson(payload);
          if (!parsed.ok) {
            setStatus(`Invalid JSON: ${parsed.error}`);
            return true;
          }
        }
        onPublish(topic.trim(), payload);
        setStatus("Published");
        closeDialog();
        return true;
      }
      if (focus === "table") {
        if (key.name === "down" || key.name === "j") {
          setTableRow((prev) => Math.min(rows.length - 1, prev + 1));
          return true;
        }
        if (key.name === "up" || key.name === "k") {
          setTableRow((prev) => Math.max(0, prev - 1));
          return true;
        }
      }
      if (focus === "saved") {
        if (key.name === "return") {
          const msg = savedMessages[savedIndex];
          if (msg) {
            onLoadSaved(msg);
            setTopic(msg.topic);
            loadPayloadRows(msg.payload);
            setStatus(`Loaded ${msg.name}`);
          }
          setFocus("table");
          return true;
        }
        if (key.name === "d" || key.name === "delete") {
          onDeleteSaved(savedIndex);
          return true;
        }
      }
      return false;
    },
    [
      closeDialog,
      focus,
      onDeleteSaved,
      onLoadSaved,
      onPublish,
      onSaveMessage,
      rawPayload,
      rows,
      saveName,
      savedIndex,
      savedMessages,
      showSavePrompt,
      tableColumn,
      tableRow,
      topic,
    ],
  );

  useKeyboard((key) => {
    handleKey(key);
  });

  return (
    <box
      title={mode === "edit" ? "Edit Message" : "New Message"}
      border
      style={{
        position: "absolute",
        width: "85%",
        height: "80%",
        left: "7%",
        top: "10%",
        borderStyle: "double",
        borderColor: "#3b82f6",
        backgroundColor: "#0c1019",
        padding: 1,
        zIndex: 100,
        flexDirection: "column",
        gap: 1,
      }}
    >
      <box style={{ flexDirection: "row", gap: 1, flexGrow: 1 }}>
        <box style={{ flexDirection: "column", flexGrow: 1, gap: 1 }}>
          <box border style={{ height: 3, borderColor: "#1f2937" }}>
            <input
              value={topic}
              onInput={setTopic}
              placeholder="topic"
              focused={!showSavePrompt && focus === "topic"}
              style={{ focusedBackgroundColor: "#111827" }}
            />
          </box>
          <box style={{ flexGrow: 1, flexDirection: "column", gap: 1 }}>
            <box style={{ flexDirection: "row", gap: 1 }}>
              <text content="Key" fg="#94a3b8" />
              <text content="Value" fg="#94a3b8" />
            </box>
            <scrollbox style={{ flexGrow: 1, width: "100%" }} scrollY>
              <box style={{ flexDirection: "column", gap: 0 }}>
                {rows.map((row, index) => (
                  <box
                    key={`row-${index}`}
                    border
                    style={{ height: 3, borderColor: "#1f2937", flexDirection: "row", gap: 1, paddingLeft: 1, paddingRight: 1 }}
                  >
                    <box style={{ width: "45%" }}>
                      <input
                        value={row.key}
                        onInput={(value) => {
                          updateRow(index, { key: value });
                          if (rawPayload && value !== "payload") setRawPayload(false);
                        }}
                        placeholder="key"
                        focused={!showSavePrompt && focus === "table" && tableRow === index && tableColumn === "key"}
                        style={{
                          focusedBackgroundColor: "#111827",
                          textColor: jsonColors.key,
                          focusedTextColor: jsonColors.key,
                        }}
                      />
                    </box>
                    <box style={{ flexGrow: 1 }}>
                      <input
                        value={row.value}
                        onInput={(value) => updateRow(index, { value })}
                        placeholder="value"
                        focused={!showSavePrompt && focus === "table" && tableRow === index && tableColumn === "value"}
                        style={{
                          focusedBackgroundColor: "#111827",
                          textColor: getValueColor(row.value),
                          focusedTextColor: getValueColor(row.value),
                        }}
                      />
                    </box>
                  </box>
                ))}
              </box>
            </scrollbox>
          </box>
        </box>
        <box style={{ width: 32, flexDirection: "column", gap: 1 }}>
          <box style={{ flexGrow: 1, flexDirection: "column", gap: 1 }}>
            <text content="Preview" fg="#94a3b8" />
            <box border style={{ flexGrow: 1, borderColor: "#1f2937" }}>
              <scrollbox style={{ flexGrow: 1, width: "100%" }} scrollY focused={false}>
                {previewParsed.ok ? (
                  <text content={highlightJson(previewContent)} />
                ) : (
                  <text content={previewContent} fg="#9ca3af" />
                )}
              </scrollbox>
            </box>
          </box>
          <box style={{ height: "40%", flexDirection: "column", gap: 1 }}>
            <text content="Saved Messages" fg="#94a3b8" />
            <select
              options={savedOptions}
              focused={!showSavePrompt && focus === "saved"}
              selectedIndex={savedIndex}
              onChange={(index) => setSavedIndex(index)}
              backgroundColor={focus === "saved" ? paneActiveBackground : paneInactiveBackground}
              focusedBackgroundColor={paneActiveBackground}
              selectedBackgroundColor={focus === "saved" ? "#2d8cff" : paneInactiveBackground}
              selectedTextColor={focus === "saved" ? "#0b1220" : "#ffffff"}
              textColor={focus === "saved" ? "#e2e8f0" : "#ffffff"}
              descriptionColor={focus === "saved" ? "#9ca3af" : "#ffffff"}
              style={{ height: "100%", width: "100%" }}
            />
          </box>
        </box>
      </box>
      {showSavePrompt ? (
        <box style={{ flexDirection: "column", gap: 0 }}>
          <text content="Save Message" fg="#94a3b8" />
          <input
            value={saveName}
            onInput={setSaveName}
            placeholder="Message name"
            focused
            style={{ focusedBackgroundColor: "#111827" }}
          />
        </box>
      ) : null}
      <text
        content={
          status
            ? `Status: ${status} | Tab/Shift+Tab fields | Ctrl+k clear field | Ctrl+n add row | Ctrl+d delete row | Ctrl+s save | Ctrl+l saved list | Esc close`
            : "Tab/Shift+Tab fields | Ctrl+k clear field | Ctrl+n add row | Ctrl+d delete row | Ctrl+s save | Ctrl+l saved list | Esc close"
        }
        fg="#94a3b8"
      />
    </box>
  );
};
