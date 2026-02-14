import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { BrokerConfig } from "../state";
import { loadRecentBrokers, type RecentBrokerEntry } from "../storage";
import { useDialog } from "./DialogContext";

type BrokerDialogProps = {
  initialBroker: BrokerConfig;
  onSave: (broker: BrokerConfig) => void;
};

export const BrokerDialog = ({ initialBroker, onSave }: BrokerDialogProps) => {
  const { closeDialog } = useDialog();
  const [broker, setBroker] = useState<BrokerConfig>(initialBroker);
  const [focusIndex, setFocusIndex] = useState(0);
  const [recentBrokers, setRecentBrokers] = useState<RecentBrokerEntry[]>([]);
  const [recentIndex, setRecentIndex] = useState(-1);
  const [showingRecents, setShowingRecents] = useState(false);

  useEffect(() => {
    loadRecentBrokers().then(setRecentBrokers).catch(() => setRecentBrokers([]));
  }, []);

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

  const applyRecent = useCallback(
    (entry: RecentBrokerEntry) => {
      setBroker((prev) => ({
        ...prev,
        host: entry.host,
        port: entry.port,
        username: entry.username,
        tls: entry.tls,
        topicFilter: entry.topicFilter,
        defaultTopic: entry.topicFilter,
      }));
      setShowingRecents(false);
      setFocusIndex(0);
    },
    [],
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
        if (showingRecents) {
          setShowingRecents(false);
          return true;
        }
        closeDialog();
        return true;
      }

      // Toggle recents panel with Ctrl+r
      if (key.ctrl && key.name === "r") {
        setShowingRecents((prev) => !prev);
        if (recentBrokers.length > 0) setRecentIndex(0);
        return true;
      }

      if (showingRecents) {
        if (key.name === "j" || key.name === "down") {
          setRecentIndex((prev) => Math.min(recentBrokers.length - 1, prev + 1));
          return true;
        }
        if (key.name === "k" || key.name === "up") {
          setRecentIndex((prev) => Math.max(0, prev - 1));
          return true;
        }
        if (key.name === "return" && recentIndex >= 0) {
          const entry = recentBrokers[recentIndex];
          if (entry) applyRecent(entry);
          return true;
        }
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
    [broker, closeDialog, fields.length, onSave, recentBrokers, recentIndex, showingRecents, applyRecent],
  );

  useKeyboard((key) => {
    handleKey(key);
  });

  const recentOptions = recentBrokers.map((b, i) => ({
    selected: i === recentIndex,
    label: b.label,
    detail: b.username ? `user:${b.username} topic:${b.topicFilter}` : `topic:${b.topicFilter}`,
  }));

  return (
    <box
      title="Broker Configuration"
      border
      style={{
        position: "absolute",
        width: "70%",
        height: showingRecents && recentBrokers.length > 0 ? "85%" : "70%",
        left: "15%",
        top: "5%",
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
                  focused={!showingRecents && focusIndex === index}
                  style={{ focusedBackgroundColor: "#111827" }}
                />
              </box>
            </box>
          ))}
        </box>
      </scrollbox>

      {showingRecents && recentBrokers.length > 0 && (
        <box
          title="Recent Brokers (j/k navigate • Enter select • Esc close)"
          border
          style={{
            height: Math.min(recentBrokers.length + 4, 10),
            borderColor: "#3b82f6",
            flexDirection: "column",
          }}
        >
          {recentOptions.map((opt, i) => (
            <box
              key={opt.label + String(i)}
              style={{
                flexDirection: "row",
                gap: 1,
                paddingLeft: 1,
                backgroundColor: opt.selected ? "#1e3a5f" : undefined,
              }}
            >
              <text
                content={opt.selected ? `▶ ${opt.label}` : `  ${opt.label}`}
                fg={opt.selected ? "#60a5fa" : "#e2e8f0"}
              />
              <text content={`  ${opt.detail}`} fg="#64748b" />
            </box>
          ))}
        </box>
      )}

      {showingRecents && recentBrokers.length === 0 && (
        <box style={{ paddingLeft: 1 }}>
          <text content="No recent brokers saved yet." fg="#64748b" />
        </box>
      )}

      <text
        content={
          showingRecents
            ? "j/k navigate • Enter select • Esc close recents"
            : `Tab/Shift+Tab fields • Enter save • Esc close${recentBrokers.length > 0 ? " • Ctrl+r recent brokers" : ""}`
        }
        fg="#94a3b8"
      />
    </box>
  );
};
