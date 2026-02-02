import { useKeyboard, useRenderer } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";
import type { Action } from "../app/reducer";
import type { AppState } from "../state";
import { useDialog, type DialogType } from "../dialogs/DialogContext";
import type { Dispatch } from "react";
import { handleKeyboardShortcut } from "./keyboardLogic";

type UseKeyboardShortcutsProps = {
  state: AppState;
  dispatch: Dispatch<Action>;
  topicEntries: Array<{ path: string; depth: number; hasChildren: boolean }>;
  topicPaths: string[];
  payloadEntries: Array<{ path: string; value: unknown; type: string }>;
};

export const useKeyboardShortcuts = ({
  state,
  dispatch,
  topicEntries,
  topicPaths,
  payloadEntries,
}: UseKeyboardShortcutsProps) => {
  const { activeDialog, openDialog, dialogHandler } = useDialog();
  const renderer = useRenderer();

  useKeyboard((key: KeyEvent) => {
    handleKeyboardShortcut(key, {
      state,
      dispatch,
      topicEntries,
      topicPaths,
      payloadEntries,
      activeDialog: Boolean(activeDialog),
      dialogHandler: dialogHandler ?? undefined,
      openDialog: (dialog) => openDialog(dialog as DialogType),
      destroyRenderer: () => renderer?.destroy(),
      exit: (code) => process.exit(code),
    });
  });
};
