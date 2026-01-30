import React, { createContext, useContext, useMemo, useState } from "react";
import type { KeyEvent } from "@opentui/core";

export type DialogType =
  | { type: "search" }
  | { type: "help" }
  | { type: "broker" }
  | { type: "filters" }
  | { type: "renameFavourite" }
  | { type: "edit" }
  | { type: "new" };

export type DialogKeyHandler = (key: KeyEvent) => boolean;

type DialogContextValue = {
  activeDialog: DialogType | null;
  openDialog: (dialog: DialogType) => void;
  closeDialog: () => void;
  dialogHandler: DialogKeyHandler | null;
  setDialogHandler: (handler: DialogKeyHandler | null) => void;
};

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeDialog, setActiveDialog] = useState<DialogType | null>(null);
  const [dialogHandler, setDialogHandler] = useState<DialogKeyHandler | null>(null);

  const openDialog = (dialog: DialogType) => {
    setActiveDialog(dialog);
    setDialogHandler(null);
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setDialogHandler(null);
  };

  const value = useMemo(
    () => ({ activeDialog, openDialog, closeDialog, dialogHandler, setDialogHandler }),
    [activeDialog, dialogHandler],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
};

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
};
