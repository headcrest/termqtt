import { useKeyboard, useRenderer } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";
import type { Action } from "../app/reducer";
import type { AppState } from "../state";
import { useDialog } from "../dialogs/DialogContext";
import type { Dispatch } from "react";

type UseKeyboardShortcutsProps = {
  state: AppState;
  dispatch: Dispatch<Action>;
  visibleTopics: string[];
  payloadEntries: Array<{ path: string; value: unknown }>;
};

export const useKeyboardShortcuts = ({
  state,
  dispatch,
  visibleTopics,
  payloadEntries,
}: UseKeyboardShortcutsProps) => {
  const { activeDialog, openDialog, dialogHandler } = useDialog();
  const renderer = useRenderer();

  useKeyboard((key: KeyEvent) => {
    if (activeDialog) {
      dialogHandler?.(key);
      return;
    }

    if (key.ctrl && key.name === "f") {
      openDialog({ type: "filters" });
      return;
    }
    if (key.name === "q") {
      renderer?.destroy();
      return;
    }
    if (key.name === "/") {
      openDialog({ type: "search" });
      return;
    }
    if (key.name === "?") {
      openDialog({ type: "help" });
      return;
    }
    if (key.name === "b") {
      openDialog({ type: "broker" });
      return;
    }

    if (key.name === "h" || key.name === "left") {
      const columns: AppState["activePane"][][] = [
        ["topics", "favourites"],
        ["payload", "watchlist"],
        ["details"],
      ];
      const colIndex = columns.findIndex((col) => col.includes(state.activePane));
      const next = columns[Math.max(0, colIndex - 1)]?.[0] || "topics";
      dispatch({ type: "set", data: { activePane: next } });
      return;
    }
    if (key.name === "l" || key.name === "right") {
      const columns: AppState["activePane"][][] = [
        ["topics", "favourites"],
        ["payload", "watchlist"],
        ["details"],
      ];
      const colIndex = columns.findIndex((col) => col.includes(state.activePane));
      const next = columns[Math.min(columns.length - 1, colIndex + 1)]?.[0] || "details";
      dispatch({ type: "set", data: { activePane: next } });
      return;
    }
    if (key.name === "u") {
      if (state.activePane === "favourites") dispatch({ type: "set", data: { activePane: "topics" } });
      if (state.activePane === "watchlist") dispatch({ type: "set", data: { activePane: "payload" } });
      return;
    }
    if (key.name === "n") {
      if (state.activePane === "details") {
        openDialog({ type: "new" });
        return;
      }
      if (state.activePane === "topics") dispatch({ type: "set", data: { activePane: "favourites" } });
      if (state.activePane === "payload") dispatch({ type: "set", data: { activePane: "watchlist" } });
      return;
    }
    if (key.name === "e" && state.activePane === "details") {
      openDialog({ type: "edit" });
      return;
    }
    if (key.name === "space") {
      if (state.activePane === "topics") {
        const topic = visibleTopics[state.selectedTopicIndex];
        if (!topic) return;
        const exists = state.favourites.find((fav) => fav.topic === topic);
        const favourites = exists
          ? state.favourites.filter((fav) => fav.topic !== topic)
          : [...state.favourites, { topic }];
        dispatch({ type: "set", data: { favourites } });
      }
      if (state.activePane === "favourites") {
        const favourites = state.favourites.filter((_, idx) => idx !== state.selectedFavouriteIndex);
        dispatch({ type: "set", data: { favourites } });
      }
      if (state.activePane === "payload") {
        const topic = visibleTopics[state.selectedTopicIndex];
        const entry = payloadEntries[state.selectedPayloadIndex];
        if (!topic || !entry) return;
        const exists = state.watchlist.find((item) => item.topic === topic && item.path === entry.path);
        const watchlist = exists
          ? state.watchlist.filter((item) => !(item.topic === topic && item.path === entry.path))
          : [...state.watchlist, { topic, path: entry.path }];
        dispatch({ type: "set", data: { watchlist } });
      }
      if (state.activePane === "watchlist") {
        const watchlist = state.watchlist.filter((_, idx) => idx !== state.selectedWatchIndex);
        dispatch({ type: "set", data: { watchlist } });
      }
      return;
    }
    if (key.name === "r" && state.activePane === "favourites") {
      openDialog({ type: "renameFavourite" });
    }
  });
};
