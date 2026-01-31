import { formatValue } from "../json";
import { jsonColors } from "../ui/jsonColors";
import { paneActiveBackground } from "../ui/paneTheme";

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
      return jsonColors.string;
    case "number":
      return jsonColors.number;
    case "boolean":
      return jsonColors.boolean;
    case "null":
      return jsonColors.null;
    case "array":
      return jsonColors.array;
    case "object":
      return jsonColors.object;
    default:
      return jsonColors.default;
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
    <box
      title={`2 Payload (${count})`}
      border
      style={{
        height: "100%",
        borderColor: focused ? "#3b82f6" : "#ffffff",
        backgroundColor: focused ? paneActiveBackground : undefined,
      }}
    >
      <box style={{ height: "100%", width: "100%", flexDirection: "column" }}>
        <box style={{ flexDirection: "row", gap: 1 }}>
          <text content={formatKeyCell("Key", keyWidth)} fg={focused ? "#94a3b8" : "#ffffff"} />
          <text content="Value" fg={focused ? "#94a3b8" : "#ffffff"} />
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
                  <text content={formatKeyCell(entry.path, keyWidth)} fg={jsonColors.key} />
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
