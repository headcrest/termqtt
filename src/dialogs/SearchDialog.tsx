import { useCallback, useEffect, useState } from "react";
import type { KeyEvent } from "@opentui/core";
import { useDialog } from "./DialogContext";

type SearchDialogProps = {
  initialQuery: string;
  onSubmit: (value: string) => void;
};

export const SearchDialog = ({ initialQuery, onSubmit }: SearchDialogProps) => {
  const { closeDialog, setDialogHandler } = useDialog();
  const [value, setValue] = useState(initialQuery);

  const handleKey = useCallback(
    (key: KeyEvent) => {
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

  useEffect(() => {
    setDialogHandler(handleKey);
    return () => setDialogHandler(null);
  }, [handleKey, setDialogHandler]);

  return (
    <box
      title="Search Topics"
      border
      style={{
        position: "absolute",
        width: 50,
        height: 5,
        left: "15%",
        top: "10%",
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
        placeholder="Type to filter topics..."
        focused
        style={{ focusedBackgroundColor: "#111827" }}
      />
    </box>
  );
};
