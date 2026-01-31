export type BrokerConfig = {
  host: string;
  port: number;
  clientId: string;
  username: string;
  password: string;
  topicFilter: string;
  defaultTopic: string;
  tls: boolean;
  qos: 0 | 1 | 2;
};

export type TopicMessage = {
  topic: string;
  payload: string;
  json?: unknown;
  error?: string;
  receivedAt: number;
};

export type Favourite = {
  topic: string;
  alias?: string;
};

export type WatchEntry = {
  topic: string;
  path: string;
};

export type SavedMessage = {
  name: string;
  topic: string;
  payload: string;
};

export type ExcludeFilter = {
  pattern: string;
  enabled: boolean;
};

export type Pane = "topics" | "favourites" | "payload" | "watchlist" | "details";

export type AppState = {
  broker: BrokerConfig;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  connectionError?: string;
  messageCount: number;
  lastMessageTopic?: string;
  lastMessageAt?: number;
  lastSubscription?: string;
  subscriptionInfo?: string;
  debugKeys: boolean;
  lastKeyDebug?: string;
  topicExpansion: Record<string, boolean>;
  topics: string[];
  messages: Record<string, TopicMessage>;
  favourites: Favourite[];
  watchlist: WatchEntry[];
  savedMessages: SavedMessage[];
  excludeFilters: ExcludeFilter[];
  searchQuery: string;
  selectedTopicIndex: number;
  selectedPayloadIndex: number;
  selectedFavouriteIndex: number;
  selectedWatchIndex: number;
  activePane: Pane;
};

export type StateListener = (state: AppState) => void;

export const createDefaultBrokerConfig = (): BrokerConfig => ({
  host: "localhost",
  port: 1883,
  clientId: "termqtt2",
  username: "",
  password: "",
  topicFilter: "#",
  defaultTopic: "",
  tls: false,
  qos: 0,
});

export const createInitialState = (): AppState => ({
  broker: createDefaultBrokerConfig(),
  connectionStatus: "disconnected",
  messageCount: 0,
  debugKeys: false,
  topicExpansion: {},
  topics: [],
  messages: {},
  favourites: [],
  watchlist: [],
  savedMessages: [],
  excludeFilters: [
    { pattern: "read", enabled: true },
    { pattern: "data", enabled: true },
    { pattern: "config", enabled: true },
  ],
  searchQuery: "",
  selectedTopicIndex: 0,
  selectedPayloadIndex: 0,
  selectedFavouriteIndex: 0,
  selectedWatchIndex: 0,
  activePane: "topics",
});

export const createStore = (initial: AppState) => {
  let state = initial;
  const listeners = new Set<StateListener>();

  const getState = () => state;

  const setState = (partial: Partial<AppState>) => {
    state = { ...state, ...partial };
    for (const listener of listeners) listener(state);
  };

  const updateState = (updater: (current: AppState) => AppState) => {
    state = updater(state);
    for (const listener of listeners) listener(state);
  };

  const subscribe = (listener: StateListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { getState, setState, updateState, subscribe };
};
