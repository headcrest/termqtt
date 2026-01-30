import { useCallback, useEffect } from "react";
import type { KeyEvent } from "@opentui/core";
import { useDialog } from "./DialogContext";

export const HelpDialog = () => {
  const { closeDialog, setDialogHandler } = useDialog();

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (key.name === "escape" || key.name === "return") {
        closeDialog();
        return true;
      }
      return false;
    },
    [closeDialog],
  );

  useEffect(() => {
    setDialogHandler(handleKey);
    return () => setDialogHandler(null);
  }, [handleKey, setDialogHandler]);

  return (
    <box
      title="Help"
      border
      style={{
        position: "absolute",
        width: "80%",
        height: "70%",
        left: "10%",
        top: "10%",
        borderStyle: "double",
        borderColor: "#3b82f6",
        backgroundColor: "#0c1019",
        padding: 1,
        zIndex: 100,
        flexDirection: "column",
      }}
    >
      <text
        content={`Global\n\n- Tab / Shift+Tab cycle sections (1→2→3→4→5)\n- 1 Topics, 2 Payload, 3 Details, 4 Favourites, 5 Watchlist\n- j/k or ↓/↑ move selection\n- h/l or ←/→ collapse/expand tree\n- b broker config\n- / search topics\n- Ctrl+f exclude filters\n- ? help\n- q quit\n\nTopics\n- space toggle favourite (leaf topics)\n\nFavourites\n- space remove favourite\n- r rename favourite\n\nPayload\n- space toggle watchlist\n\nWatchlist\n- space remove watch entry\n\nDetails\n- e edit and publish\n- n new message\n\nDialogs\n- Tab/Shift+Tab change field\n- Ctrl+k clear payload\n- Ctrl+x clear all fields\n- Ctrl+t focus topic\n- Ctrl+s save message\n- Ctrl+l focus saved list\n- Enter confirm\n- Esc cancel`}
        fg="#cbd5f5"
      />
    </box>
  );
};
