import { useEffect, useMemo, useReducer } from "react";
import type { SelectOption } from "@opentui/core";
import { DialogProvider } from "../dialogs/DialogContext";
import { DialogHost } from "../dialogs/DialogHost";
import { PaneLayout } from "../components/PaneLayout";
import { StatusBar } from "../components/StatusBar";
import { useMqtt } from "../hooks/useMqtt";
import { usePersistence } from "../hooks/usePersistence";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { reducer } from "./reducer";
import {
  getDetailsText,
  getPayloadEntries,
  getSelectedMessage,
  getStatusLines,
  getVisibleTopics,
  getWatchOptions,
} from "./selectors";
import {
  createInitialState,
  type AppState,
  type BrokerConfig,
  type Favourite,
  type SavedMessage,
} from "../state";
import { formatValue } from "../json";

const AppContent = () => {
  const [state, dispatch] = useReducer(reducer, createInitialState());
  const { publish } = useMqtt(state.broker, dispatch);

  usePersistence(state, dispatch);

  const visibleTopics = useMemo(
    () => getVisibleTopics(state.topics, state.excludeFilters, state.searchQuery),
    [state.topics, state.excludeFilters, state.searchQuery],
  );

  const selectedMessage = useMemo(
    () => getSelectedMessage(state, visibleTopics),
    [state, visibleTopics],
  );

  const payloadEntries = useMemo(() => getPayloadEntries(selectedMessage), [selectedMessage]);
  const watchOptions = useMemo(() => getWatchOptions(state), [state]);
  const detailsText = useMemo(() => getDetailsText(selectedMessage), [selectedMessage]);
  const statusLines = useMemo(() => getStatusLines(state), [state]);

  useKeyboardShortcuts({ state, dispatch, visibleTopics, payloadEntries });

  useEffect(() => {
    if (state.selectedTopicIndex >= visibleTopics.length) {
      dispatch({
        type: "set",
        data: { selectedTopicIndex: Math.max(0, visibleTopics.length - 1) },
      });
    }
  }, [state.selectedTopicIndex, visibleTopics.length]);

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
    () => visibleTopics.map((topic) => ({ name: topic, description: "" })),
    [visibleTopics],
  );

  const favouritesOptions: SelectOption[] = useMemo(
    () =>
      state.favourites.map((fav) => ({
        name: fav.alias || fav.topic,
        description: fav.alias ? fav.topic : "",
      })),
    [state.favourites],
  );

  const payloadOptions: SelectOption[] = useMemo(
    () => payloadEntries.map((entry) => ({ name: entry.path, description: formatValue(entry.value) })),
    [payloadEntries],
  );

  const handleFavouriteSelect = (index: number) => {
    const fav = state.favourites[index];
    if (!fav) return;
    const topicIndex = visibleTopics.indexOf(fav.topic);
    if (topicIndex >= 0) {
      dispatch({ type: "set", data: { selectedTopicIndex: topicIndex, activePane: "topics" } });
    } else {
      dispatch({ type: "set", data: { searchQuery: "", activePane: "topics" } });
    }
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
        payloadOptions={payloadOptions}
        watchOptions={watchOptions}
        topicsCount={visibleTopics.length}
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
        onFavouriteChange={(index) => dispatch({ type: "set", data: { selectedFavouriteIndex: index } })}
        onFavouriteSelect={handleFavouriteSelect}
        onPayloadChange={(index) => dispatch({ type: "set", data: { selectedPayloadIndex: index } })}
        onWatchChange={(index) => dispatch({ type: "set", data: { selectedWatchIndex: index } })}
        detailsTitle={selectedMessage ? `Details (${selectedMessage.topic})` : "Details"}
        detailsContent={detailsText}
      />
      <DialogHost
        state={state}
        visibleTopics={visibleTopics}
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
