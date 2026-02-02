import type { KeyEvent } from "@opentui/core";
import type { Dispatch } from "react";
import { getFirstLeafTopicPath, getTopicTreeEntries } from "../app/selectors";
import type { Action } from "../app/reducer";
import type { AppState } from "../state";

export type KeyboardContext = {
  state: AppState;
  dispatch: Dispatch<Action>;
  topicEntries: Array<{ path: string; depth: number; hasChildren: boolean }>;
  topicPaths: string[];
  payloadEntries: Array<{ path: string; value: unknown; type: string }>;
  activeDialog: boolean;
  dialogHandler?: (key: KeyEvent) => void;
  openDialog: (dialog: { type: string }) => void;
  destroyRenderer?: () => void;
  exit: (code?: number) => void;
};

const isShiftTab = (key: KeyEvent) => {
  if (key.name === "backtab") return true;
  if (key.name === "tab" && key.shift) return true;
  if (key.name === "teb") return true;
  if (key.sequence === "\u001b[Z") return true;
  if (key.sequence && key.sequence.endsWith("[Z")) return true;
  if (key.sequence === "[") return true;
  return false;
};

export const handleKeyboardShortcut = (key: KeyEvent, context: KeyboardContext) => {
  const { state, dispatch, topicEntries, topicPaths, payloadEntries } = context;
  if (!key) return false;

  if (key.ctrl && key.name === "g") {
    dispatch({
      type: "set",
      data: {
        debugKeys: !state.debugKeys,
        lastKeyDebug: `${key.name ?? ""}:${JSON.stringify(key.sequence ?? "")}`.trim(),
      },
    });
    return true;
  }

  if (state.debugKeys) {
    dispatch({
      type: "set",
      data: { lastKeyDebug: `${key.name ?? ""}:${JSON.stringify(key.sequence ?? "")}`.trim() },
    });
  }

  if (context.activeDialog) {
    context.dialogHandler?.(key);
    return true;
  }

  const moveSelection = (direction: "up" | "down") => {
    const delta = direction === "up" ? -1 : 1;
    if (state.activePane === "topics") {
      const next = Math.max(0, Math.min(topicEntries.length - 1, state.selectedTopicIndex + delta));
      dispatch({ type: "set", data: { selectedTopicIndex: next } });
    }
    if (state.activePane === "favourites") {
      const next = Math.max(0, Math.min(state.favourites.length - 1, state.selectedFavouriteIndex + delta));
      dispatch({ type: "set", data: { selectedFavouriteIndex: next } });
    }
    if (state.activePane === "payload") {
      const next = Math.max(0, Math.min(payloadEntries.length - 1, state.selectedPayloadIndex + delta));
      dispatch({ type: "set", data: { selectedPayloadIndex: next } });
    }
    if (state.activePane === "watchlist") {
      const next = Math.max(0, Math.min(state.watchlist.length - 1, state.selectedWatchIndex + delta));
      dispatch({ type: "set", data: { selectedWatchIndex: next } });
    }
  };

  const toggleExpand = (direction: "expand" | "collapse") => {
    if (state.activePane !== "topics") return;
    const entry = topicEntries[state.selectedTopicIndex];
    const path = topicPaths[state.selectedTopicIndex];
    if (!entry || !path) return;
    if (entry.hasChildren) {
      const defaultExpanded = entry.depth === 0;
      const current = state.topicExpansion[entry.path] ?? defaultExpanded;
      const next = direction === "expand" ? true : false;
      if (current === next) return;
      if (!next) {
        const nextExpansion = { ...state.topicExpansion, [entry.path]: false };
        const nextTree = getTopicTreeEntries({
          ...state,
          topicExpansion: nextExpansion,
        });
        const nextIndex = nextTree.topicPaths.indexOf(entry.path);
        dispatch({
          type: "set",
          data: {
            topicExpansion: nextExpansion,
            selectedTopicIndex: nextIndex >= 0 ? nextIndex : state.selectedTopicIndex,
          },
        });
        return;
      }
      const leafPath = getFirstLeafTopicPath(state, entry.path);
      if (!leafPath) {
        dispatch({
          type: "set",
          data: { topicExpansion: { ...state.topicExpansion, [entry.path]: true } },
        });
        return;
      }
      const nextExpansion = { ...state.topicExpansion };
      const parts = leafPath.split("/").filter((part) => part.length > 0);
      let currentPath = "";
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        nextExpansion[currentPath] = true;
        if (currentPath === leafPath) break;
      }
      const nextTree = getTopicTreeEntries({
        ...state,
        topicExpansion: nextExpansion,
      });
      const leafIndex = nextTree.topicPaths.indexOf(leafPath);
      dispatch({
        type: "set",
        data: {
          topicExpansion: nextExpansion,
          selectedTopicIndex: leafIndex >= 0 ? leafIndex : state.selectedTopicIndex,
        },
      });
      return;
    }
    if (direction === "collapse") {
      const parentPath = path.includes("/") ? path.split("/").slice(0, -1).join("/") : "";
      if (!parentPath) return;
      const nextExpansion = { ...state.topicExpansion, [parentPath]: false };
      const nextTree = getTopicTreeEntries({
        ...state,
        topicExpansion: nextExpansion,
      });
      const nextIndex = nextTree.topicPaths.indexOf(parentPath);
      dispatch({
        type: "set",
        data: {
          topicExpansion: nextExpansion,
          selectedTopicIndex: nextIndex >= 0 ? nextIndex : state.selectedTopicIndex,
        },
      });
    }
  };

  if (key.name === "f") {
    context.openDialog({ type: "filters" });
    return true;
  }
  if (key.name === "q") {
    context.destroyRenderer?.();
    context.exit(0);
    return true;
  }
  if (key.name === "/") {
    context.openDialog({ type: "search" });
    return true;
  }
  if (key.name === "?") {
    context.openDialog({ type: "help" });
    return true;
  }
  if (key.name === "b") {
    context.openDialog({ type: "broker" });
    return true;
  }
  if (key.name === "p") {
    dispatch({ type: "set", data: { updatesPaused: !state.updatesPaused } });
    return true;
  }

  if (isShiftTab(key)) {
    const order: AppState["activePane"][] = ["topics", "payload", "details", "favourites", "watchlist"];
    const index = order.indexOf(state.activePane);
    const next = order[(index - 1 + order.length) % order.length] || "topics";
    dispatch({ type: "set", data: { activePane: next } });
    return true;
  }
  if (key.name === "tab") {
    const order: AppState["activePane"][] = ["topics", "payload", "details", "favourites", "watchlist"];
    const index = order.indexOf(state.activePane);
    const next = order[(index + 1) % order.length] || "topics";
    dispatch({ type: "set", data: { activePane: next } });
    return true;
  }

  if (key.name === "1") {
    dispatch({ type: "set", data: { activePane: "topics" } });
    return true;
  }
  if (key.name === "2") {
    dispatch({ type: "set", data: { activePane: "payload" } });
    return true;
  }
  if (key.name === "3") {
    dispatch({ type: "set", data: { activePane: "details" } });
    return true;
  }
  if (key.name === "4") {
    const fav = state.favourites[state.selectedFavouriteIndex];
    if (fav) {
      const topicIndex = topicPaths.indexOf(fav.topic);
      if (topicIndex >= 0) {
        dispatch({
          type: "set",
          data: { activePane: "favourites", selectedTopicIndex: topicIndex, selectedPayloadIndex: 0 },
        });
        return true;
      }
      const parts = fav.topic.split("/").filter((part) => part.length > 0);
      const nextExpansion = { ...state.topicExpansion };
      let currentPath = "";
      for (const part of parts.slice(0, -1)) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        nextExpansion[currentPath] = true;
      }
      const nextTree = getTopicTreeEntries({
        ...state,
        topicExpansion: nextExpansion,
      });
      const nextIndex = nextTree.topicPaths.indexOf(fav.topic);
      dispatch({
        type: "set",
        data: {
          activePane: "favourites",
          topicExpansion: nextExpansion,
          selectedTopicIndex: nextIndex >= 0 ? nextIndex : state.selectedTopicIndex,
          selectedPayloadIndex: nextIndex >= 0 ? 0 : state.selectedPayloadIndex,
        },
      });
      return true;
    }
    dispatch({ type: "set", data: { activePane: "favourites" } });
    return true;
  }
  if (key.name === "5") {
    dispatch({ type: "set", data: { activePane: "watchlist" } });
    return true;
  }

  if (key.name === "j" || key.name === "down") {
    moveSelection("down");
    return true;
  }
  if (key.name === "k" || key.name === "up") {
    moveSelection("up");
    return true;
  }
  if (key.name === "h" || key.name === "left") {
    toggleExpand("collapse");
    return true;
  }
  if (key.name === "l" || key.name === "right") {
    toggleExpand("expand");
    return true;
  }

  if (key.name === "n") {
    context.openDialog({ type: "new" });
    return true;
  }
  if (key.name === "e" && state.activePane === "details") {
    context.openDialog({ type: "edit" });
    return true;
  }
  if (key.name === "space") {
    if (state.activePane === "topics") {
      const entry = topicEntries[state.selectedTopicIndex];
      const topic = topicPaths[state.selectedTopicIndex];
      if (!entry || !topic || entry.hasChildren) return true;
      const exists = state.favourites.find((fav) => fav.topic === topic);
      const favourites = exists
        ? state.favourites.filter((fav) => fav.topic !== topic)
        : [...state.favourites, { topic }];
      dispatch({ type: "set", data: { favourites } });
    }
    if (state.activePane === "favourites") {
      if (state.favourites.length === 0) return true;
      const index = Math.min(state.selectedFavouriteIndex, state.favourites.length - 1);
      const favourites = state.favourites.filter((_, idx) => idx !== index);
      dispatch({
        type: "set",
        data: {
          favourites,
          selectedFavouriteIndex: favourites.length === 0 ? -1 : Math.max(0, index - 1),
        },
      });
    }
    if (state.activePane === "payload") {
      const topic = topicPaths[state.selectedTopicIndex];
      const entry = payloadEntries[state.selectedPayloadIndex];
      if (!topic || !entry) return true;
      const exists = state.watchlist.find((item) => item.topic === topic && item.path === entry.path);
      const watchlist = exists
        ? state.watchlist.filter((item) => !(item.topic === topic && item.path === entry.path))
        : [...state.watchlist, { topic, path: entry.path }];
      dispatch({ type: "set", data: { watchlist } });
    }
    if (state.activePane === "watchlist") {
      if (state.watchlist.length === 0) return true;
      const index = Math.min(state.selectedWatchIndex, state.watchlist.length - 1);
      const watchlist = state.watchlist.filter((_, idx) => idx !== index);
      dispatch({
        type: "set",
        data: {
          watchlist,
          selectedWatchIndex: watchlist.length === 0 ? -1 : Math.max(0, index - 1),
        },
      });
    }
    return true;
  }
  if (key.name === "r" && state.activePane === "favourites") {
    context.openDialog({ type: "renameFavourite" });
    return true;
  }

  return false;
};
