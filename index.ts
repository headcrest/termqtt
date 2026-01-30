import {
  createCliRenderer,
  InputRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  TextareaRenderable,
  type CliRenderer,
  type KeyEvent,
  BoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { createLayout } from "./src/ui/layout";
import {
  createInitialState,
  createStore,
  type AppState,
  type BrokerConfig,
  type ExcludeFilter,
  type Favourite,
  type Pane,
  type SavedMessage,
  type WatchEntry,
} from "./src/state";
import { MqttManager } from "./src/mqtt";
import { flattenJson, formatValue, parseJson, prettyJson } from "./src/json";
import { loadJson, saveJson, storageFiles } from "./src/storage";

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
});

const store = createStore(createInitialState());

const loadPersistedState = async () => {
  const broker = await loadJson(storageFiles.broker, store.getState().broker);
  const favourites = await loadJson(storageFiles.favourites, store.getState().favourites);
  const watchlist = await loadJson(storageFiles.watchlist, store.getState().watchlist);
  const savedMessages = await loadJson(storageFiles.savedMessages, store.getState().savedMessages);
  const excludeFilters = await loadJson(storageFiles.filters, store.getState().excludeFilters);

  store.setState({
    broker,
    favourites,
    watchlist,
    savedMessages,
    excludeFilters,
  });
};

await loadPersistedState();

const ui = createLayout(renderer);

const mqtt = new MqttManager(store.getState().broker, {
  onStatus: (status, error) => {
    store.setState({ connectionStatus: status, connectionError: error });
  },
  onMessage: (topic, payload) => {
    store.updateState((state) => {
      const nextMessages = { ...state.messages };
      const parsed = parseJson(payload);
      nextMessages[topic] = {
        topic,
        payload,
        json: parsed.ok ? parsed.value : undefined,
        error: parsed.ok ? undefined : parsed.error,
        receivedAt: Date.now(),
      };
      const topics = state.topics.includes(topic)
        ? state.topics
        : [...state.topics, topic].sort();
      return {
        ...state,
        messages: nextMessages,
        topics,
        messageCount: state.messageCount + 1,
        lastMessageTopic: topic,
        lastMessageAt: Date.now(),
      };
    });
  },
  onSubscription: (filter, info) => {
    store.setState({ lastSubscription: filter, subscriptionInfo: info });
  },
});

mqtt.connect();

const highlightColor = "#3b82f6";
const normalBorderColor = "#2a3344";

let visibleTopics: string[] = [];
let visibleFavourites: Favourite[] = [];
let payloadEntries: { path: string; value: unknown }[] = [];
type DialogHandler = {
  handleKey: (key: KeyEvent) => boolean;
  close: () => void;
};

let activeDialog: DialogHandler | null = null;
const dialogStack: DialogHandler[] = [];

const matchTopicFilter = (topic: string, filter: string): boolean => {
  if (filter === "#") return true;
  const filterLevels = filter.split("/");
  const topicLevels = topic.split("/");
  for (let i = 0; i < filterLevels.length; i += 1) {
    const part = filterLevels[i];
    if (part === "#") return true;
    if (i >= topicLevels.length) return false;
    if (part === "+") continue;
    if (part !== topicLevels[i]) return false;
  }
  return filterLevels.length === topicLevels.length;
};

const applyFilters = (topics: string[], filters: ExcludeFilter[], query: string) => {
  const activeFilters = filters.filter((filter) => filter.enabled && filter.pattern.trim().length > 0);
  const lowered = query.toLowerCase();
  return topics.filter((topic) => {
    if (lowered && !topic.toLowerCase().includes(lowered)) return false;
    for (const filter of activeFilters) {
      if (matchTopicFilter(topic, filter.pattern)) return false;
    }
    return true;
  });
};

const setActivePane = (pane: Pane) => {
  store.setState({ activePane: pane });
  const reset = () => {
    ui.topicsBox.borderColor = normalBorderColor;
    ui.favouritesBox.borderColor = normalBorderColor;
    ui.payloadBox.borderColor = normalBorderColor;
    ui.watchBox.borderColor = normalBorderColor;
    ui.detailsBox.borderColor = normalBorderColor;
  };
  reset();
  if (pane === "topics") ui.topicsBox.borderColor = highlightColor;
  if (pane === "favourites") ui.favouritesBox.borderColor = highlightColor;
  if (pane === "payload") ui.payloadBox.borderColor = highlightColor;
  if (pane === "watchlist") ui.watchBox.borderColor = highlightColor;
  if (pane === "details") ui.detailsBox.borderColor = highlightColor;

  if (pane === "topics") ui.topicsList.focus();
  if (pane === "favourites") ui.favouritesList.focus();
  if (pane === "payload") ui.payloadList.focus();
  if (pane === "watchlist") ui.watchList.focus();
};

const buildStatusLines = (state: AppState) => {
  const status = state.connectionStatus.toUpperCase();
  const host = `${state.broker.host}:${state.broker.port}`;
  const filter = state.broker.topicFilter || "#";
  const search = state.searchQuery ? `search:${state.searchQuery}` : "search:off";
  const excludes = state.excludeFilters.filter((f) => f.enabled).length;
  const error = state.connectionError ? `error:${state.connectionError}` : "";
  const lastTopic = state.lastMessageTopic ? `last:${state.lastMessageTopic}` : "last:none";
  const total = `messages:${state.messageCount}`;
  const sub = state.subscriptionInfo
    ? `sub:${state.lastSubscription || "-"} ${state.subscriptionInfo}`
    : `sub:${state.lastSubscription || "-"}`;
  const line1 = `${status}  broker:${host}  filter:${filter}  ${search}`.trim();
  const line2 = `${total}  ${lastTopic}  ${sub}  excludes:${excludes} ${error}`.trim();
  return { line1, line2 };
};

const updateLists = (state: AppState) => {
  visibleTopics = applyFilters(state.topics, state.excludeFilters, state.searchQuery);
  let selectedTopicIndex = state.selectedTopicIndex;
  if (selectedTopicIndex >= visibleTopics.length) {
    selectedTopicIndex = Math.max(0, visibleTopics.length - 1);
  }

  ui.topicsList.options = visibleTopics.map((topic) => ({ name: topic, description: "" }));
  ui.topicsList.selectedIndex = selectedTopicIndex;
  ui.topicsBox.title = `Topics (${visibleTopics.length})`;

  visibleFavourites = state.favourites;
  let selectedFavouriteIndex = state.selectedFavouriteIndex;
  if (selectedFavouriteIndex >= visibleFavourites.length) {
    selectedFavouriteIndex = Math.max(0, visibleFavourites.length - 1);
  }

  ui.favouritesList.options = visibleFavourites.map((fav) => ({
    name: fav.alias || fav.topic,
    description: fav.alias ? fav.topic : "",
  }));
  ui.favouritesList.selectedIndex = selectedFavouriteIndex;
  ui.favouritesBox.title = `Favourites (${visibleFavourites.length})`;

  const selectedTopic = visibleTopics[selectedTopicIndex];
  const message = selectedTopic ? state.messages[selectedTopic] : undefined;
  payloadEntries = [];
  if (message?.json !== undefined) {
    payloadEntries = flattenJson(message.json).map((entry) => ({
      path: entry.path,
      value: entry.value,
    }));
  } else if (message) {
    payloadEntries = [{ path: "payload", value: message.payload }];
  }

  let selectedPayloadIndex = state.selectedPayloadIndex;
  if (selectedPayloadIndex >= payloadEntries.length) {
    selectedPayloadIndex = Math.max(0, payloadEntries.length - 1);
  }

  ui.payloadList.options = payloadEntries.map((entry) => ({
    name: entry.path,
    description: formatValue(entry.value),
  }));
  ui.payloadList.selectedIndex = selectedPayloadIndex;
  ui.payloadBox.title = `Payload (${payloadEntries.length})`;

  const watchOptions = state.watchlist.map((entry) => {
    const msg = state.messages[entry.topic];
    let value = "";
    if (msg?.json !== undefined) {
      const flattened = flattenJson(msg.json).find((item) => item.path === entry.path);
      value = flattened ? formatValue(flattened.value) : "";
    }
    return {
      name: `${entry.topic}:${entry.path}`,
      description: value,
    };
  });

  ui.watchList.options = watchOptions;
  let selectedWatchIndex = state.selectedWatchIndex;
  if (selectedWatchIndex >= watchOptions.length) {
    selectedWatchIndex = Math.max(0, watchOptions.length - 1);
  }
  ui.watchList.selectedIndex = selectedWatchIndex;
  ui.watchBox.title = `Watchlist (${state.watchlist.length})`;

  if (message?.json !== undefined) {
    ui.detailsText.content = prettyJson(message.json);
  } else if (message) {
    ui.detailsText.content = message.payload;
  } else {
    ui.detailsText.content = "No message selected";
  }

  ui.detailsBox.title = selectedTopic ? `Details (${selectedTopic})` : "Details";

  if (
    selectedTopicIndex !== state.selectedTopicIndex ||
    selectedPayloadIndex !== state.selectedPayloadIndex ||
    selectedFavouriteIndex !== state.selectedFavouriteIndex ||
    selectedWatchIndex !== state.selectedWatchIndex
  ) {
    store.setState({
      selectedTopicIndex,
      selectedPayloadIndex,
      selectedFavouriteIndex,
      selectedWatchIndex,
    });
  }
};

store.subscribe((state) => {
  const { line1, line2 } = buildStatusLines(state);
  ui.statusText.content = line1;
  ui.statusText2.content = line2;
  updateLists(state);
});

updateLists(store.getState());
setActivePane(store.getState().activePane);

const updateFavourites = (updater: (current: Favourite[]) => Favourite[]) => {
  store.updateState((state) => ({ ...state, favourites: updater(state.favourites) }));
  void saveJson(storageFiles.favourites, store.getState().favourites);
};

const updateWatchlist = (updater: (current: WatchEntry[]) => WatchEntry[]) => {
  store.updateState((state) => ({ ...state, watchlist: updater(state.watchlist) }));
  void saveJson(storageFiles.watchlist, store.getState().watchlist);
};

const updateFilters = (filters: ExcludeFilter[]) => {
  store.setState({ excludeFilters: filters });
  void saveJson(storageFiles.filters, filters);
};

const updateSavedMessages = (savedMessages: SavedMessage[]) => {
  store.setState({ savedMessages });
  void saveJson(storageFiles.savedMessages, savedMessages);
};

const updateBroker = (broker: BrokerConfig) => {
  store.setState({ broker });
  void saveJson(storageFiles.broker, broker);
  mqtt.updateConfig(broker);
};

const openDialog = (dialog: DialogHandler, options?: { stack?: boolean }) => {
  if (options?.stack && activeDialog) {
    dialogStack.push(activeDialog);
    activeDialog = dialog;
    return;
  }
  if (activeDialog) activeDialog.close();
  activeDialog = dialog;
};

const closeDialog = () => {
  if (!activeDialog) return;
  activeDialog.close();
  activeDialog = dialogStack.pop() ?? null;
  if (!activeDialog) setActivePane(store.getState().activePane);
};

const createModal = (
  renderer: CliRenderer,
  title: string,
  width: number | `${number}%`,
  height: number | `${number}%`,
) => {
  const modal = new BoxRenderable(renderer, {
    id: `modal-${Math.random().toString(16).slice(2)}`,
    position: "absolute",
    width,
    height,
    left: "15%",
    top: "10%",
    border: true,
    borderStyle: "double",
    borderColor: "#3b82f6",
    backgroundColor: "#0c1019",
    padding: 1,
    zIndex: 100,
    title,
    titleAlignment: "center",
    flexDirection: "column",
  });
  renderer.root.add(modal);
  return modal;
};

const openSearchDialog = () => {
  const modal = createModal(renderer, "Search Topics", 50, 5);
  const input = new InputRenderable(renderer, {
    id: "search-input",
    width: "100%",
    value: store.getState().searchQuery,
    placeholder: "Type to filter topics...",
    focusedBackgroundColor: "#111827",
  });
  modal.add(input);
  input.focus();

  openDialog({
    handleKey: (key) => {
      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (key.name === "return") {
        store.setState({ searchQuery: input.value });
        closeDialog();
        return true;
      }
      return false;
    },
    close: () => {
      renderer.root.remove(modal.id);
    },
  });
};

const openHelpDialog = () => {
  const modal = createModal(renderer, "Help", "80%", "70%" as const);
  const helpText = `Global\n\n- h/← focus previous pane\n- l/→ focus next pane\n- u focus up within column\n- n focus down within column\n- j/k move in list\n- b broker config\n- / search topics\n- Ctrl+f exclude filters\n- ? help\n- q quit\n\nTopics\n- space toggle favourite\n\nFavourites\n- space remove favourite\n- r rename favourite\n\nPayload\n- space toggle watchlist\n\nWatchlist\n- space remove watch entry\n\nDetails\n- e edit and publish\n- n new message\n\nDialogs\n- Tab/Shift+Tab change field\n- Ctrl+k clear payload\n- Ctrl+x clear all fields\n- Ctrl+t focus topic\n- Ctrl+s save message\n- Ctrl+l focus saved list\n- Enter confirm\n- Esc cancel`;
  const text = new TextRenderable(renderer, {
    id: "help-text",
    content: helpText,
    fg: "#cbd5f5",
  });
  modal.add(text);

  openDialog({
    handleKey: (key) => {
      if (key.name === "escape" || key.name === "return") {
        closeDialog();
        return true;
      }
      return false;
    },
    close: () => {
      renderer.root.remove(modal.id);
    },
  });
};

const openBrokerDialog = () => {
  const modal = createModal(renderer, "Broker Configuration", "70%", "60%" as const);
  const fields = [
    { label: "Host", value: store.getState().broker.host },
    { label: "Port", value: String(store.getState().broker.port) },
    { label: "Client ID", value: store.getState().broker.clientId },
    { label: "Username", value: store.getState().broker.username },
    { label: "Password", value: store.getState().broker.password },
    { label: "Subscribe Filter (topicFilter)", value: store.getState().broker.topicFilter },
    { label: "Publish Default Topic", value: store.getState().broker.defaultTopic },
    { label: "TLS (true/false)", value: String(store.getState().broker.tls) },
    { label: "QoS (0/1/2)", value: String(store.getState().broker.qos) },
  ];

  const inputs: InputRenderable[] = [];
  fields.forEach((field, index) => {
    const label = new TextRenderable(renderer, {
      id: `broker-label-${index}`,
      content: field.label,
      fg: "#94a3b8",
    });
    const input = new InputRenderable(renderer, {
      id: `broker-input-${index}`,
      width: "100%",
      value: field.value,
      focusedBackgroundColor: "#111827",
    });
    const row = new BoxRenderable(renderer, {
      id: `broker-row-${index}`,
      flexDirection: "column",
      gap: 0,
    });
    row.add(label);
    row.add(input);
    modal.add(row);
    inputs.push(input);
  });

  if (inputs.length === 0) {
    renderer.root.remove(modal.id);
    return;
  }

  let focusIndex = 0;
  inputs[focusIndex]!.focus();

  openDialog({
    handleKey: (key) => {
      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (key.name === "tab") {
        focusIndex = (focusIndex + 1) % inputs.length;
        inputs[focusIndex]!.focus();
        return true;
      }
      if (key.shift && key.name === "tab") {
        focusIndex = (focusIndex - 1 + inputs.length) % inputs.length;
        inputs[focusIndex]!.focus();
        return true;
      }
      if (key.name === "return") {
        const next: BrokerConfig = {
          host: inputs[0]?.value || "localhost",
          port: Number(inputs[1]?.value) || 1883,
          clientId: inputs[2]?.value || "termqtt2",
          username: inputs[3]?.value || "",
          password: inputs[4]?.value || "",
          topicFilter: inputs[5]?.value || "#",
          defaultTopic: inputs[6]?.value || "",
          tls: (inputs[7]?.value || "").trim().toLowerCase() === "true",
          qos: (Number(inputs[8]?.value) as 0 | 1 | 2) || 0,
        };
        updateBroker(next);
        closeDialog();
        return true;
      }
      return false;
    },
    close: () => {
      renderer.root.remove(modal.id);
    },
  });
};

const openFilterDialog = () => {
  const modal = createModal(renderer, "Exclude Filters", 60, "60%" as const);
  let filters = [...store.getState().excludeFilters];

  const list = new SelectRenderable(renderer, {
    id: "filters-list",
    width: "100%",
    height: "100%",
    options: [],
    selectedBackgroundColor: "#38bdf8",
    selectedTextColor: "#0b1220",
  });

  const refresh = () => {
    list.options = filters.map((filter) => ({
      name: filter.pattern,
      description: filter.enabled ? "enabled" : "disabled",
    }));
  };
  refresh();
  modal.add(list);
  list.focus();

  const openInlinePrompt = (title: string, initialValue: string, onSave: (value: string) => void) => {
    const prompt = createModal(renderer, title, 50, 5);
    const input = new InputRenderable(renderer, {
      id: "filter-input",
      width: "100%",
      value: initialValue,
      focusedBackgroundColor: "#111827",
    });
    prompt.add(input);
    input.focus();

    openDialog({
      handleKey: (key) => {
        if (key.name === "escape") {
          closeDialog();
          list.focus();
          return true;
        }
        if (key.name === "return") {
          onSave(input.value.trim());
          closeDialog();
          list.focus();
          refresh();
          return true;
        }
        return false;
      },
      close: () => {
        renderer.root.remove(prompt.id);
      },
    }, { stack: true });
  };

  const dialog = {
    handleKey: (key: KeyEvent) => {
      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (key.name === "return") {
        updateFilters(filters);
        closeDialog();
        return true;
      }
      if (key.name === "space") {
        const index = list.getSelectedIndex();
        const filter = filters[index];
        if (filter) {
          filters = filters.map((entry, idx) =>
            idx === index ? { ...entry, enabled: !entry.enabled } : entry,
          );
          refresh();
        }
        return true;
      }
      if (key.name === "a") {
        openInlinePrompt("Add Filter", "", (value) => {
          if (!value) return;
          filters = [...filters, { pattern: value, enabled: true }];
        });
        return true;
      }
      if (key.name === "e") {
        const index = list.getSelectedIndex();
        const filter = filters[index];
        if (!filter) return true;
        openInlinePrompt("Edit Filter", filter.pattern, (value) => {
          if (!value) return;
          filters = filters.map((entry, idx) =>
            idx === index ? { ...entry, pattern: value } : entry,
          );
        });
        return true;
      }
      if (key.name === "d") {
        const index = list.getSelectedIndex();
        filters = filters.filter((_, idx) => idx !== index);
        refresh();
        return true;
      }
      return false;
    },
    close: () => {
      renderer.root.remove(modal.id);
    },
  };

  openDialog(dialog);
};

const openRenameFavouriteDialog = () => {
  const favourite = visibleFavourites[store.getState().selectedFavouriteIndex];
  if (!favourite) return;
  const modal = createModal(renderer, "Rename Favourite", 50, 5);
  const input = new InputRenderable(renderer, {
    id: "rename-input",
    width: "100%",
    value: favourite.alias || favourite.topic,
    focusedBackgroundColor: "#111827",
  });
  modal.add(input);
  input.focus();

  openDialog({
    handleKey: (key) => {
      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (key.name === "return") {
        const alias = input.value.trim();
        updateFavourites((current) =>
          current.map((fav) =>
            fav.topic === favourite.topic ? { ...fav, alias: alias || undefined } : fav,
          ),
        );
        closeDialog();
        return true;
      }
      return false;
    },
    close: () => {
      renderer.root.remove(modal.id);
    },
  });
};

const openMessageDialog = (mode: "edit" | "new") => {
  const state = store.getState();
  const selectedTopic = visibleTopics[state.selectedTopicIndex];
  const selectedMessage = selectedTopic ? state.messages[selectedTopic] : undefined;
  const modal = createModal(
    renderer,
    mode === "edit" ? "Edit Message" : "New Message",
    "85%",
    "80%" as const,
  );

  const contentRow = new BoxRenderable(renderer, {
    id: "message-dialog-row",
    flexDirection: "row",
    gap: 1,
    flexGrow: 1,
  });

  const fieldsColumn = new BoxRenderable(renderer, {
    id: "message-fields",
    flexDirection: "column",
    flexGrow: 1,
    gap: 1,
  });

  const savedColumn = new BoxRenderable(renderer, {
    id: "message-saved",
    width: 28,
    flexDirection: "column",
    gap: 1,
  });

  const topicInput = new InputRenderable(renderer, {
    id: "message-topic",
    width: "100%",
    value: mode === "edit" ? selectedTopic || state.broker.defaultTopic : state.broker.defaultTopic,
    placeholder: "topic",
    focusedBackgroundColor: "#111827",
  });

  const payloadTextarea = new TextareaRenderable(renderer, {
    id: "message-payload",
    width: "100%",
    height: "100%",
    initialValue:
      mode === "edit"
        ? selectedMessage?.json !== undefined
          ? prettyJson(selectedMessage.json)
          : selectedMessage?.payload || ""
        : "{}",
    focusedBackgroundColor: "#111827",
    focusedTextColor: "#e2e8f0",
  });

  const statusLine = new TextRenderable(renderer, {
    id: "message-status",
    content: "Enter to publish • Ctrl+s save • Ctrl+l saved list • Esc close",
    fg: "#94a3b8",
  });

  const savedList = new SelectRenderable(renderer, {
    id: "saved-list",
    width: "100%",
    height: "100%",
    options: state.savedMessages.map((msg) => ({ name: msg.name, description: msg.topic })),
    selectedBackgroundColor: "#facc15",
    selectedTextColor: "#0b1220",
  });

  const savedTitle = new TextRenderable(renderer, {
    id: "saved-title",
    content: "Saved Messages",
    fg: "#94a3b8",
  });

  fieldsColumn.add(topicInput);
  fieldsColumn.add(payloadTextarea);
  savedColumn.add(savedTitle);
  savedColumn.add(savedList);
  contentRow.add(fieldsColumn);
  contentRow.add(savedColumn);
  modal.add(contentRow);
  modal.add(statusLine);

  let focusTarget: "topic" | "payload" | "saved" = "payload";
  payloadTextarea.focus();

  const refreshSavedList = () => {
    savedList.options = store.getState().savedMessages.map((msg) => ({
      name: msg.name,
      description: msg.topic,
    }));
  };

  const openSavePrompt = () => {
    const prompt = createModal(renderer, "Save Message", 50, 5);
    const input = new InputRenderable(renderer, {
      id: "save-message-input",
      width: "100%",
      placeholder: "Message name",
      focusedBackgroundColor: "#111827",
    });
    prompt.add(input);
    input.focus();

    openDialog({
      handleKey: (key) => {
        if (key.name === "escape") {
          closeDialog();
          payloadTextarea.focus();
          return true;
        }
        if (key.name === "return") {
          const name = input.value.trim();
          if (name) {
            const entry: SavedMessage = {
              name,
              topic: topicInput.value.trim(),
              payload: payloadTextarea.plainText,
            };
            updateSavedMessages([...store.getState().savedMessages, entry]);
            refreshSavedList();
          }
          closeDialog();
          payloadTextarea.focus();
          return true;
        }
        return false;
      },
      close: () => {
        renderer.root.remove(prompt.id);
      },
    }, { stack: true });
  };

  const publishMessage = () => {
    const topic = topicInput.value.trim();
    if (!topic) {
      statusLine.content = "Topic is required";
      return;
    }
    const payload = payloadTextarea.plainText;
    const parsed = parseJson(payload);
    if (!parsed.ok) {
      statusLine.content = `Invalid JSON: ${parsed.error}`;
      return;
    }
    mqtt.publish(topic, payload);
    statusLine.content = "Published";
    closeDialog();
  };

  const dialog = {
    handleKey: (key: KeyEvent) => {
      if (key.name === "escape") {
        closeDialog();
        return true;
      }
      if (key.ctrl && key.name === "k") {
        payloadTextarea.setText("");
        statusLine.content = "Cleared payload";
        return true;
      }
      if (key.ctrl && key.name === "x") {
        topicInput.value = "";
        payloadTextarea.setText("");
        statusLine.content = "Cleared all fields";
        return true;
      }
      if (key.ctrl && key.name === "t") {
        focusTarget = "topic";
        topicInput.focus();
        return true;
      }
      if (key.ctrl && key.name === "s") {
        openSavePrompt();
        return true;
      }
      if (key.ctrl && key.name === "l") {
        focusTarget = "saved";
        savedList.focus();
        return true;
      }
      if (key.name === "tab") {
        if (focusTarget === "topic") {
          focusTarget = "payload";
          payloadTextarea.focus();
        } else {
          focusTarget = "topic";
          topicInput.focus();
        }
        return true;
      }
      if (key.name === "return" && focusTarget !== "saved") {
        publishMessage();
        return true;
      }
      if (focusTarget === "saved") {
        if (key.name === "return") {
          const selected = savedList.getSelectedIndex();
          const msg = store.getState().savedMessages[selected];
          if (msg) {
            topicInput.value = msg.topic;
            payloadTextarea.setText(msg.payload);
            statusLine.content = `Loaded ${msg.name}`;
          }
          focusTarget = "payload";
          payloadTextarea.focus();
          return true;
        }
        if (key.name === "d" || key.name === "delete") {
          const selected = savedList.getSelectedIndex();
          const next = store.getState().savedMessages.filter((_, idx) => idx !== selected);
          updateSavedMessages(next);
          refreshSavedList();
          return true;
        }
        if (key.name === "escape") {
          focusTarget = "payload";
          payloadTextarea.focus();
          return true;
        }
      }
      return false;
    },
    close: () => {
      renderer.root.remove(modal.id);
    },
  };

  openDialog(dialog);
};

const moveColumn = (direction: "left" | "right") => {
  const state = store.getState();
  const columns: Pane[][] = [
    ["topics", "favourites"],
    ["payload", "watchlist"],
    ["details"],
  ];
  const current = state.activePane;
  const colIndex = columns.findIndex((col) => col.includes(current));
  if (colIndex === -1) return;
  const nextIndex = direction === "left" ? colIndex - 1 : colIndex + 1;
  const nextColumn = columns[Math.max(0, Math.min(columns.length - 1, nextIndex))];
  const newPane = nextColumn?.[0] ?? "details";
  setActivePane(newPane);
};

const moveWithinColumn = (direction: "up" | "down") => {
  const state = store.getState();
  if (state.activePane === "topics" && direction === "down") return setActivePane("favourites");
  if (state.activePane === "favourites" && direction === "up") return setActivePane("topics");
  if (state.activePane === "payload" && direction === "down") return setActivePane("watchlist");
  if (state.activePane === "watchlist" && direction === "up") return setActivePane("payload");
};

const toggleFavourite = () => {
  const topic = visibleTopics[store.getState().selectedTopicIndex];
  if (!topic) return;
  updateFavourites((current) => {
    const exists = current.find((fav) => fav.topic === topic);
    if (exists) return current.filter((fav) => fav.topic !== topic);
    return [...current, { topic }];
  });
};

const toggleWatch = () => {
  const state = store.getState();
  const topic = visibleTopics[state.selectedTopicIndex];
  const entry = payloadEntries[state.selectedPayloadIndex];
  if (!topic || !entry) return;
  updateWatchlist((current) => {
    const exists = current.find((item) => item.topic === topic && item.path === entry.path);
    if (exists) return current.filter((item) => !(item.topic === topic && item.path === entry.path));
    return [...current, { topic, path: entry.path }];
  });
};

const removeWatch = () => {
  const index = store.getState().selectedWatchIndex;
  updateWatchlist((current) => current.filter((_, idx) => idx !== index));
};

const removeFavourite = () => {
  const index = store.getState().selectedFavouriteIndex;
  updateFavourites((current) => current.filter((_, idx) => idx !== index));
};

ui.topicsList.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
  store.setState({ selectedTopicIndex: index, selectedPayloadIndex: 0 });
});

ui.favouritesList.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
  store.setState({ selectedFavouriteIndex: index });
});

ui.favouritesList.on(SelectRenderableEvents.ITEM_SELECTED, (index: number) => {
  const fav = visibleFavourites[index];
  if (!fav) return;
  const topicIndex = visibleTopics.indexOf(fav.topic);
  if (topicIndex >= 0) {
    store.setState({ selectedTopicIndex: topicIndex, activePane: "topics" });
    setActivePane("topics");
  } else {
    store.setState({ searchQuery: "", activePane: "topics" });
    setActivePane("topics");
  }
});

ui.payloadList.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
  store.setState({ selectedPayloadIndex: index });
});

ui.watchList.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
  store.setState({ selectedWatchIndex: index });
});

renderer.keyInput.on("keypress", (key: KeyEvent) => {
  if (activeDialog) {
    activeDialog.handleKey(key);
    return;
  }

  if (key.ctrl && key.name === "f") {
    openFilterDialog();
    return;
  }

  if (key.name === "q") {
    renderer.destroy();
    return;
  }

  if (key.name === "/") {
    openSearchDialog();
    return;
  }

  if (key.name === "?") {
    openHelpDialog();
    return;
  }

  if (key.name === "b") {
    openBrokerDialog();
    return;
  }

  if (key.name === "h" || key.name === "left") {
    moveColumn("left");
    return;
  }

  if (key.name === "l" || key.name === "right") {
    moveColumn("right");
    return;
  }

  if (key.name === "u") {
    moveWithinColumn("up");
    return;
  }

  if (key.name === "n") {
    if (store.getState().activePane === "details") {
      openMessageDialog("new");
      return;
    }
    moveWithinColumn("down");
    return;
  }

  if (key.name === "e" && store.getState().activePane === "details") {
    openMessageDialog("edit");
    return;
  }

  if (key.name === "space") {
    const active = store.getState().activePane;
    if (active === "topics") toggleFavourite();
    if (active === "favourites") removeFavourite();
    if (active === "payload") toggleWatch();
    if (active === "watchlist") removeWatch();
    return;
  }

  if (key.name === "r" && store.getState().activePane === "favourites") {
    openRenameFavouriteDialog();
    return;
  }
});
