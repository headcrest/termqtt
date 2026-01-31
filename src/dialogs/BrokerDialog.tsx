import { useCallback, useMemo, useState } from "react";
import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { BrokerConfig } from "../state";
import { useDialog } from "./DialogContext";

type BrokerDialogProps = {
  initialBroker: BrokerConfig;
  onSave: (broker: BrokerConfig) => void;
};

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
        label: "Client ID",
        value: broker.clientId,
        set: (value: string) => setBroker((prev) => ({ ...prev, clientId: value })),
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
        label: "Subscribe Filter (topicFilter)",
        value: broker.topicFilter,
        set: (value: string) => setBroker((prev) => ({ ...prev, topicFilter: value })),
      },
      {
        label: "Publish Default Topic",
        value: broker.defaultTopic,
        set: (value: string) => setBroker((prev) => ({ ...prev, defaultTopic: value })),
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
        onSave(broker);
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

  return (
    <box
      title="Broker Configuration"
      border
      style={{
        position: "absolute",
        width: "70%",
        height: "60%",
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
      {fields.map((field, index) => (
        <box key={field.label} style={{ flexDirection: "column" }}>
          <text content={field.label} fg="#94a3b8" />
          <input
            value={field.value}
            onInput={field.set}
            focused={focusIndex === index}
            style={{ focusedBackgroundColor: "#111827" }}
          />
        </box>
      ))}
    </box>
  );
};
