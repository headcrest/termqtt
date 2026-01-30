import { useDialog } from "./DialogContext";
import type { AppState, BrokerConfig, SavedMessage } from "../state";
import { SearchDialog } from "./SearchDialog";
import { HelpDialog } from "./HelpDialog";
import { BrokerDialog } from "./BrokerDialog";
import { FiltersDialog } from "./FiltersDialog";
import { RenameFavouriteDialog } from "./RenameFavouriteDialog";
import { MessageDialog } from "./MessageDialog";

type DialogHostProps = {
  state: AppState;
  topicPaths: string[];
  onSearch: (value: string) => void;
  onSaveBroker: (broker: BrokerConfig) => void;
  onSaveFilters: (filters: AppState["excludeFilters"]) => void;
  onRenameFavourite: (value: string) => void;
  onPublish: (topic: string, payload: string) => void;
  onSaveMessage: (name: string, topic: string, payload: string) => void;
  onDeleteSavedMessage: (index: number) => void;
  onLoadSavedMessage: (message: SavedMessage) => void;
};

export const DialogHost = ({
  state,
  topicPaths,
  onSearch,
  onSaveBroker,
  onSaveFilters,
  onRenameFavourite,
  onPublish,
  onSaveMessage,
  onDeleteSavedMessage,
  onLoadSavedMessage,
}: DialogHostProps) => {
  const { activeDialog } = useDialog();
  if (!activeDialog) return null;

  const selectedTopic = topicPaths[state.selectedTopicIndex];
  const selectedMessage = selectedTopic ? state.messages[selectedTopic] : undefined;

  if (activeDialog.type === "search") {
    return <SearchDialog initialQuery={state.searchQuery} onSubmit={onSearch} />;
  }

  if (activeDialog.type === "help") {
    return <HelpDialog />;
  }

  if (activeDialog.type === "broker") {
    return <BrokerDialog initialBroker={state.broker} onSave={onSaveBroker} />;
  }

  if (activeDialog.type === "filters") {
    return <FiltersDialog initialFilters={state.excludeFilters} onSave={onSaveFilters} />;
  }

  if (activeDialog.type === "renameFavourite") {
    const fav = state.favourites[state.selectedFavouriteIndex];
    return (
      <RenameFavouriteDialog
        initialValue={fav?.alias || fav?.topic || ""}
        onSave={onRenameFavourite}
      />
    );
  }

  if (activeDialog.type === "edit" || activeDialog.type === "new") {
    const topic =
      activeDialog.type === "edit"
        ? selectedTopic || state.broker.defaultTopic
        : state.broker.defaultTopic;
    const payload =
      activeDialog.type === "edit"
        ? selectedMessage?.json !== undefined
          ? JSON.stringify(selectedMessage.json, null, 2)
          : selectedMessage?.payload || ""
        : "{}";
    return (
      <MessageDialog
        mode={activeDialog.type}
        initialTopic={topic || ""}
        initialPayload={payload}
        savedMessages={state.savedMessages}
        onPublish={onPublish}
        onSaveMessage={onSaveMessage}
        onDeleteSaved={onDeleteSavedMessage}
        onLoadSaved={onLoadSavedMessage}
      />
    );
  }

  return null;
};
