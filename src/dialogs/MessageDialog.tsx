import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyEvent, SelectOption, TextareaRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { parseJson } from "../json";
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
  const [focus, setFocus] = useState<"topic" | "payload" | "saved">("payload");
  const [status, setStatus] = useState("");
  const [savedIndex, setSavedIndex] = useState(0);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState("");
  const textareaRef = useRef<TextareaRenderable | null>(null);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.setText(initialPayload);
  }, [initialPayload]);

  const savedOptions: SelectOption[] = useMemo(
    () => savedMessages.map((msg) => ({ name: msg.name, description: msg.topic })),
    [savedMessages],
  );

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
            const payload = textareaRef.current?.plainText ?? initialPayload;
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
        textareaRef.current?.setText("");
        setStatus("Cleared payload");
        return true;
      }
      if (key.ctrl && key.name === "x") {
        setTopic("");
        textareaRef.current?.setText("");
        setStatus("Cleared all fields");
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
      if (key.name === "tab") {
        setFocus((prev) => (prev === "topic" ? "payload" : "topic"));
        return true;
      }
      if (key.name === "return" && focus !== "saved") {
        const payload = textareaRef.current?.plainText ?? initialPayload;
        if (!topic.trim()) {
          setStatus("Topic is required");
          return true;
        }
        const parsed = parseJson(payload);
        if (!parsed.ok) {
          setStatus(`Invalid JSON: ${parsed.error}`);
          return true;
        }
        onPublish(topic.trim(), payload);
        setStatus("Published");
        closeDialog();
        return true;
      }
      if (focus === "saved") {
        if (key.name === "return") {
          const msg = savedMessages[savedIndex];
          if (msg) {
            onLoadSaved(msg);
            setTopic(msg.topic);
            textareaRef.current?.setText(msg.payload);
            setStatus(`Loaded ${msg.name}`);
          }
          setFocus("payload");
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
      initialPayload,
      onDeleteSaved,
      onLoadSaved,
      onPublish,
      onSaveMessage,
      savedIndex,
      savedMessages,
      saveName,
      showSavePrompt,
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
          <input
            value={topic}
            onInput={setTopic}
            placeholder="topic"
            focused={!showSavePrompt && focus === "topic"}
            style={{ focusedBackgroundColor: "#111827" }}
          />
          <textarea
            ref={textareaRef}
            placeholder="JSON payload"
            focused={!showSavePrompt && focus === "payload"}
            style={{ focusedBackgroundColor: "#111827", focusedTextColor: "#e2e8f0", flexGrow: 1 }}
          />
        </box>
        <box style={{ width: 28, flexDirection: "column", gap: 1 }}>
          <text content="Saved Messages" fg="#94a3b8" />
          <select
            options={savedOptions}
            focused={!showSavePrompt && focus === "saved"}
            selectedIndex={savedIndex}
            onChange={(index) => setSavedIndex(index)}
            selectedBackgroundColor="#facc15"
            selectedTextColor="#0b1220"
            style={{ height: "100%", width: "100%" }}
          />
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
        content={status || "Enter to publish • Ctrl+s save • Ctrl+l saved list • Esc close"}
        fg="#94a3b8"
      />
    </box>
  );
};
