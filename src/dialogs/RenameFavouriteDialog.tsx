import { useCallback, useState } from "react";
import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useDialog } from "./DialogContext";

type RenameFavouriteDialogProps = {
  initialValue: string;
  onSave: (value: string) => void;
};

export const RenameFavouriteDialog = ({ initialValue, onSave }: RenameFavouriteDialogProps) => {
  const { closeDialog } = useDialog();
  const [value, setValue] = useState(initialValue);

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (!key) return false;
      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (key.name === "return") {
        onSave(value.trim());
        closeDialog();
        return true;
      }
      return false;
    },
    [closeDialog, onSave, value],
  );

  useKeyboard((key) => {
    handleKey(key);
  });

  return (
    <box
      title="Rename Favourite"
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
        onInput={setValue}
        focused
        style={{ focusedBackgroundColor: "#111827" }}
      />
    </box>
  );
};
