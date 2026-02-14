import { useCallback, useMemo, useState } from "react";
import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { BrokerConfig } from "../state";
import { useDialog } from "./DialogContext";

type BrokerDialogProps = {
  initialBroker: BrokerConfig;
  onSave: (broker: BrokerConfig) => void;
};

/** Serialize extra topic filters as a comma-separated string for display in the input. */
const filtersToString = (filters: string[]): string => filters.join(", ");

/** Parse a comma-separated or newline-separated string into a topic filter list. */
const stringToFilters = (value: string): string[] =>
  value
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

export const BrokerDialog = ({ initialBroker, onSave }: BrokerDialogProps) => {
  const { closeDialog } = useDialog();
  const [broker, setBroker] = useState<BrokerConfig>(initialBroker);
  const [focusIndex, setFocusIndex] = useState(0);

  const fields = useMemo(
    () => [
      {
        label: "Host",
        value: broker.host,
        set: (value: string) => setBroker((prev) => ({ ...prev, host: value })),
      },
      {
        label: "Port",
        value: String(broker.port),
        set: (value: string) =>
          setBroker((prev) => ({ ...prev, port: Number(value) || 1883 })),
      },
      {
        label: "Username",
        value: broker.username,
        set: (value: string) => setBroker((prev) => ({ ...prev, username: value })),
      },
      {
        label: "Password",
        value: broker.password,
        set: (value: string) => setBroker((prev) => ({ ...prev, password: value })),
      },
      {
        label: "Root topic",
        value: broker.topicFilter,
        set: (value: string) => setBroker((prev) => ({ ...prev, topicFilter: value })),
      },
      {
        label: "Extra topics (comma-sep)",
        value: filtersToString(broker.topicFilters),
        set: (value: string) =>
          setBroker((prev) => ({ ...prev, topicFilters: stringToFilters(value) })),
      },
      {
        label: "TLS (true/false)",
        value: String(broker.tls),
        set: (value: string) =>
          setBroker((prev) => ({ ...prev, tls: value.trim().toLowerCase() === "true" })),
      },
      {
        label: "QoS (0/1/2)",
        value: String(broker.qos),
        set: (value: string) =>
          setBroker((prev) => ({ ...prev, qos: (Number(value) as 0 | 1 | 2) || 0 })),
      },
    ],
    [broker],
  );

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (!key) return false;
      const isShiftTab =
        key.name === "backtab" ||
        (key.name === "tab" && key.shift) ||
        key.name === "teb" ||
        key.sequence === "\u001b[Z" ||
        key.sequence === "[Z" ||
        (key.sequence ? key.sequence.endsWith("[Z") : false);
      const isTab = key.name === "tab" || key.name === "teb" || key.sequence === "\t" || key.sequence === "\u0009";
      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (isShiftTab) {
        setFocusIndex((prev) => (prev - 1 + fields.length) % fields.length);
        return true;
      }
      if (isTab) {
        setFocusIndex((prev) => (prev + 1) % fields.length);
        return true;
      }
      if (key.name === "return") {
        onSave({
          ...broker,
          defaultTopic: broker.defaultTopic || broker.topicFilter,
        });
        closeDialog();
        return true;
      }
      return false;
    },
    [broker, closeDialog, fields.length, onSave],
  );

  useKeyboard((key) => {
    handleKey(key);
  });

  const activeFilterCount = broker.topicFilters.filter((f) => f.trim().length > 0).length + 1;

  return (
    <box
      title="Broker Configuration"
      border
      style={{
        position: "absolute",
        width: "70%",
        height: "80%",
        left: "15%",
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
      <scrollbox style={{ flexGrow: 1, width: "100%" }} scrollY>
        <box style={{ flexDirection: "column", gap: 0 }}>
          {fields.map((field, index) => (
            <box
              key={field.label}
              border
              style={{
                height: 3,
                borderColor: "#1f2937",
                flexDirection: "row",
                gap: 1,
                paddingLeft: 1,
                paddingRight: 1,
              }}
            >
              <box style={{ width: "45%" }}>
                <text content={field.label} fg="#94a3b8" />
              </box>
              <box style={{ flexGrow: 1 }}>
                <input
                  value={field.value}
                  onInput={field.set}
                  focused={focusIndex === index}
                  style={{ focusedBackgroundColor: "#111827" }}
                />
              </box>
            </box>
          ))}
        </box>
      </scrollbox>
      {activeFilterCount > 1 && (
        <text
          content={`Subscribing to ${activeFilterCount} topic filters`}
          fg="#60a5fa"
        />
      )}
      <text
        content="Tab/Shift+Tab fields • Enter save • Esc close"
        fg="#94a3b8"
      />
    </box>
  );
};
