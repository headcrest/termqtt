import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyEvent } from "@opentui/core";
import type { BrokerConfig } from "../state";
import { useDialog } from "./DialogContext";

type BrokerDialogProps = {
  initialBroker: BrokerConfig;
  onSave: (broker: BrokerConfig) => void;
};

export const BrokerDialog = ({ initialBroker, onSave }: BrokerDialogProps) => {
  const { closeDialog, setDialogHandler } = useDialog();
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
      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (key.name === "tab") {
        setFocusIndex((prev) => (prev + 1) % fields.length);
        return true;
      }
      if (key.shift && key.name === "tab") {
        setFocusIndex((prev) => (prev - 1 + fields.length) % fields.length);
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

  useEffect(() => {
    setDialogHandler(handleKey);
    return () => setDialogHandler(null);
  }, [handleKey, setDialogHandler]);

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
