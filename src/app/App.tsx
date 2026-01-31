import { useEffect, useMemo, useReducer, useRef } from "react";
import type { SelectOption } from "@opentui/core";
import { DialogProvider } from "../dialogs/DialogContext";
import { DialogHost } from "../dialogs/DialogHost";
import { PaneLayout } from "../components/PaneLayout";
import { StatusBar } from "../components/StatusBar";
import { useMqtt } from "../hooks/useMqtt";
import { usePersistence } from "../hooks/usePersistence";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useDialog } from "../dialogs/DialogContext";
import { reducer } from "./reducer";
import {
  getDetailsContent,
  getPayloadEntries,
  getStatusLines,
  getFirstLeafTopicPath,
  getTopicTreeEntries,
  getWatchOptions,
} from "./selectors";
import {
  createInitialState,
  type AppState,
  type BrokerConfig,
  type Favourite,
  type SavedMessage,
} from "../state";
import { hasBrokerConfig } from "../storage";

const AppContent = () => {
  const [state, dispatch] = useReducer(reducer, createInitialState());
  const { publish } = useMqtt(state.broker, dispatch);
  const { openDialog, activeDialog } = useDialog();
  const didPromptBroker = useRef(false);

  usePersistence(state, dispatch);

  const topicTree = useMemo(() => getTopicTreeEntries(state), [state]);
  const selectedTopicPath = topicTree.topicPaths[state.selectedTopicIndex];
  const selectedMessage = selectedTopicPath ? state.messages[selectedTopicPath] : undefined;

  const payloadEntries = useMemo(() => getPayloadEntries(selectedMessage), [selectedMessage]);
  const watchOptions = useMemo(() => getWatchOptions(state), [state]);
  const detailsContent = useMemo(() => getDetailsContent(selectedMessage), [selectedMessage]);
  const statusLines = useMemo(() => getStatusLines(state), [state]);

  useKeyboardShortcuts({
    state,
    dispatch,
    topicEntries: topicTree.entries,
    topicPaths: topicTree.topicPaths,
    payloadEntries,
  });

  useEffect(() => {
    if (didPromptBroker.current || activeDialog) return;
    const promptIfMissing = async () => {
      if (await hasBrokerConfig()) return;
      didPromptBroker.current = true;
      openDialog({ type: "broker" });
    };
    void promptIfMissing();
  }, [activeDialog, openDialog]);

  useEffect(() => {
    if (state.selectedTopicIndex >= topicTree.entries.length) {
      dispatch({
        type: "set",
        data: { selectedTopicIndex: Math.max(0, topicTree.entries.length - 1) },
      });
    }
  }, [state.selectedTopicIndex, topicTree.entries.length]);

  useEffect(() => {
    if (state.selectedFavouriteIndex >= state.favourites.length) {
      dispatch({
        type: "set",
        data: { selectedFavouriteIndex: Math.max(0, state.favourites.length - 1) },
      });
    }
  }, [state.selectedFavouriteIndex, state.favourites.length]);

  useEffect(() => {
    if (state.selectedPayloadIndex >= payloadEntries.length) {
      dispatch({
        type: "set",
        data: { selectedPayloadIndex: Math.max(0, payloadEntries.length - 1) },
      });
    }
  }, [state.selectedPayloadIndex, payloadEntries.length]);

  useEffect(() => {
    if (state.selectedWatchIndex >= watchOptions.length) {
      dispatch({
        type: "set",
        data: { selectedWatchIndex: Math.max(0, watchOptions.length - 1) },
      });
    }
  }, [state.selectedWatchIndex, watchOptions.length]);

  const topicsOptions: SelectOption[] = useMemo(
    () => topicTree.entries.map((entry) => ({ name: entry.label, description: "" })),
    [topicTree.entries],
  );

  const favouritesOptions: SelectOption[] = useMemo(
    () =>
      state.favourites.map((fav) => ({
        name: fav.alias || fav.topic,
        description: fav.alias ? fav.topic : "",
      })),
    [state.favourites],
  );


  const handleFavouriteSelect = (index: number) => {
    const fav = state.favourites[index];
    if (!fav) return;
    const topicIndex = topicTree.topicPaths.indexOf(fav.topic);
    if (topicIndex >= 0) {
      dispatch({ type: "set", data: { selectedTopicIndex: topicIndex, activePane: "topics" } });
      return;
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
        topicExpansion: nextExpansion,
        selectedTopicIndex: nextIndex >= 0 ? nextIndex : state.selectedTopicIndex,
        activePane: "topics",
      },
    });
  };

  const handleFavouriteChange = (index: number) => {
    const fav = state.favourites[index];
    if (!fav) {
      dispatch({ type: "set", data: { selectedFavouriteIndex: index } });
      return;
    }
    const topicIndex = topicTree.topicPaths.indexOf(fav.topic);
    if (topicIndex >= 0) {
      dispatch({
        type: "set",
        data: {
          selectedFavouriteIndex: index,
          selectedTopicIndex: topicIndex,
          selectedPayloadIndex: 0,
        },
      });
      return;
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
        selectedFavouriteIndex: index,
        selectedTopicIndex: nextIndex >= 0 ? nextIndex : state.selectedTopicIndex,
        selectedPayloadIndex: nextIndex >= 0 ? 0 : state.selectedPayloadIndex,
        topicExpansion: nextExpansion,
      },
    });
  };

  const handleTopicSelect = (index: number) => {
    const entry = topicTree.entries[index];
    if (!entry || !entry.hasChildren) return;
    const current = state.topicExpansion[entry.path];
    const defaultExpanded = entry.depth === 0;
    const next = !(current ?? defaultExpanded);
    if (!next) {
      dispatch({
        type: "set",
        data: { topicExpansion: { ...state.topicExpansion, [entry.path]: false } },
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
  };

  const handleRenameFavourite = (value: string) => {
    const fav = state.favourites[state.selectedFavouriteIndex];
    if (!fav) return;
    const favourites: Favourite[] = state.favourites.map((entry) =>
      entry.topic === fav.topic ? { ...entry, alias: value || undefined } : entry,
    );
    dispatch({ type: "set", data: { favourites } });
  };

  const handleSaveBroker = (broker: BrokerConfig) => {
    dispatch({ type: "set", data: { broker } });
  };

  const handleSaveFilters = (filters: AppState["excludeFilters"]) => {
    dispatch({ type: "set", data: { excludeFilters: filters } });
  };

  const handleSaveMessage = (name: string, topic: string, payload: string) => {
    const entry: SavedMessage = { name, topic, payload };
    dispatch({ type: "set", data: { savedMessages: [...state.savedMessages, entry] } });
  };

  const handleDeleteSavedMessage = (index: number) => {
    dispatch({
      type: "set",
      data: { savedMessages: state.savedMessages.filter((_, idx) => idx !== index) },
    });
  };

  return (
    <box style={{ width: "100%", height: "100%", flexDirection: "column", backgroundColor: "#0f1117" }}>
      <StatusBar line1={statusLines.line1} line2={statusLines.line2} />
      <PaneLayout
        activePane={state.activePane}
        topicsOptions={topicsOptions}
        favouritesOptions={favouritesOptions}
        payloadEntries={payloadEntries}
        watchOptions={watchOptions}
        topicsCount={topicTree.entries.length}
        favouritesCount={state.favourites.length}
        payloadCount={payloadEntries.length}
        watchCount={state.watchlist.length}
        selectedTopicIndex={state.selectedTopicIndex}
        selectedFavouriteIndex={state.selectedFavouriteIndex}
        selectedPayloadIndex={state.selectedPayloadIndex}
        selectedWatchIndex={state.selectedWatchIndex}
        onTopicChange={(index) =>
          dispatch({ type: "set", data: { selectedTopicIndex: index, selectedPayloadIndex: 0 } })
        }
        onTopicSelect={handleTopicSelect}
        onFavouriteChange={handleFavouriteChange}
        onFavouriteSelect={handleFavouriteSelect}
        onPayloadChange={(index) => dispatch({ type: "set", data: { selectedPayloadIndex: index } })}
        onWatchChange={(index) => dispatch({ type: "set", data: { selectedWatchIndex: index } })}
        detailsTitle={selectedMessage ? `Details (${selectedMessage.topic})` : "Details"}
        detailsContent={detailsContent.content}
        detailsIsJson={detailsContent.isJson}
      />
      <DialogHost
        state={state}
        topicPaths={topicTree.topicPaths}
        onSearch={(value) => dispatch({ type: "set", data: { searchQuery: value } })}
        onSaveBroker={handleSaveBroker}
        onSaveFilters={handleSaveFilters}
        onRenameFavourite={handleRenameFavourite}
        onPublish={(topic, payload) => publish(topic, payload)}
        onSaveMessage={handleSaveMessage}
        onDeleteSavedMessage={handleDeleteSavedMessage}
        onLoadSavedMessage={() => undefined}
      />
    </box>
  );
};

export const App = () => {
  return (
    <DialogProvider>
      <AppContent />
    </DialogProvider>
  );
};
