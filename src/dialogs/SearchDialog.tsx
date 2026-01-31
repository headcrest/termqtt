import { useCallback, useState } from "react";
import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useDialog } from "./DialogContext";

type SearchDialogProps = {
  initialQuery: string;
  onSubmit: (value: string) => void;
};

export const SearchDialog = ({ initialQuery, onSubmit }: SearchDialogProps) => {
  const { closeDialog } = useDialog();
  const [value, setValue] = useState(initialQuery);

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (!key) return false;
      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (key.name === "return") {
        onSubmit(value);
        closeDialog();
        return true;
      }
      return false;
    },
    [closeDialog, onSubmit, value],
  );

  useKeyboard((key) => {
    handleKey(key);
  });

  return (
    <box
      title="Search Topics"
      border
      style={{
        position: "absolute",
        width: "60%",
        height: 5,
        left: "20%",
        top: "45%",
        borderStyle: "double",
        borderColor: "#3b82f6",
        backgroundColor: "#0c1019",
        padding: 1,
        zIndex: 100,
        flexDirection: "column",
      }}
    >
      <input
        value={value}
        onInput={(nextValue) => {
          setValue(nextValue);
          onSubmit(nextValue);
        }}
        placeholder="Type to filter topics..."
        focused
        style={{ focusedBackgroundColor: "#111827" }}
      />
    </box>
  );
};
