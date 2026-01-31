import { formatValue } from "../json";

type PayloadEntry = {
  path: string;
  value: unknown;
  type: string;
};

type PayloadPaneProps = {
  entries: PayloadEntry[];
  selectedIndex: number;
  focused: boolean;
  count: number;
  onChange: (index: number) => void;
};

const getValueColor = (type: string) => {
  switch (type) {
    case "string":
      return "#60a5fa";
    case "number":
      return "#f59e0b";
    case "boolean":
      return "#10b981";
    case "null":
      return "#9ca3af";
    case "array":
      return "#f472b6";
    case "object":
      return "#38bdf8";
    default:
      return "#e2e8f0";
  }
};

const formatPayloadValue = (value: unknown, type: string) => {
  if (type === "string") return `"${String(value)}"`;
  return formatValue(value);
};

const formatKeyCell = (path: string, width: number) => {
  if (path.length > width) {
    const cutoff = Math.max(0, width - 3);
    return `${path.slice(0, cutoff)}...`;
  }
  return path.padEnd(width, " ");
};

export const PayloadPane = ({ entries, selectedIndex, focused, count, onChange }: PayloadPaneProps) => {
  const maxPathLength = entries.reduce((max, entry) => Math.max(max, entry.path.length), 0);
  const keyWidth = Math.min(40, Math.max(10, maxPathLength));

  return (
    <box title={`2 Payload (${count})`} border style={{ height: "70%", borderColor: focused ? "#3b82f6" : "#2a3344" }}>
      <box style={{ height: "100%", width: "100%", flexDirection: "column" }}>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <text content={formatKeyCell("Key", keyWidth)} fg="#94a3b8" />
          <text content="Value" fg="#94a3b8" />
        </box>
        <scrollbox style={{ flexGrow: 1, width: "100%" }} scrollY focused={focused}>
          <box style={{ flexDirection: "column", gap: 0 }}>
            {entries.map((entry, index) => {
              const selected = index === selectedIndex;
              return (
                <box
                  key={`${entry.path}-${index}`}
                  style={{ flexDirection: "row", gap: 1, backgroundColor: selected ? "#1f2937" : undefined }}
                  onMouseUp={() => onChange(index)}
                >
                  <text content={formatKeyCell(entry.path, keyWidth)} fg={selected ? "#e2e8f0" : "#9ca3af"} />
                  <text
                    content={formatPayloadValue(entry.value, entry.type)}
                    fg={selected ? "#0b1220" : getValueColor(entry.type)}
                    bg={selected ? "#34d399" : undefined}
                  />
                </box>
              );
            })}
          </box>
        </scrollbox>
      </box>
    </box>
  );
};
