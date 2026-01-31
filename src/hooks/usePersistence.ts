import { useEffect, useRef, type Dispatch } from "react";
import { loadAll, saveAll } from "../storage";
import type { Action } from "../app/reducer";
import type { AppState, BrokerConfig, ExcludeFilter, Favourite, SavedMessage, WatchEntry } from "../state";

type Persisted = {
  broker: BrokerConfig;
  favourites: Favourite[];
  watchlist: WatchEntry[];
  savedMessages: SavedMessage[];
  excludeFilters: ExcludeFilter[];
};

const ensureDefaultFilters = (filters: ExcludeFilter[]) => {
  const defaults = ["read", "data", "config"];
  const existing = new Map(filters.map((filter) => [filter.pattern, filter]));
  for (const pattern of defaults) {
    if (!existing.has(pattern)) {
      existing.set(pattern, { pattern, enabled: true });
    }
  }
  return Array.from(existing.values());
};

const normalizeBrokerConfig = (value: unknown, fallback: BrokerConfig): BrokerConfig => {
  if (!value || typeof value !== "object") return fallback;
  const partial = value as Partial<BrokerConfig>;
  const port = Number(partial.port ?? fallback.port);
  const qosValue = Number(partial.qos ?? fallback.qos);
  const qos = qosValue === 1 || qosValue === 2 ? (qosValue as 1 | 2) : 0;
  return {
    ...fallback,
    ...partial,
    host: typeof partial.host === "string" ? partial.host : fallback.host,
    port: Number.isFinite(port) ? port : fallback.port,
    clientId: typeof partial.clientId === "string" ? partial.clientId : fallback.clientId,
    username: typeof partial.username === "string" ? partial.username : fallback.username,
    password: typeof partial.password === "string" ? partial.password : fallback.password,
    topicFilter: typeof partial.topicFilter === "string" ? partial.topicFilter : fallback.topicFilter,
    defaultTopic: typeof partial.defaultTopic === "string" ? partial.defaultTopic : fallback.defaultTopic,
    tls: typeof partial.tls === "boolean" ? partial.tls : fallback.tls,
    qos,
  };
};

export const usePersistence = (state: AppState, dispatch: Dispatch<Action>) => {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      const loaded = await loadAll<Persisted>({
        broker: state.broker,
        favourites: state.favourites,
        watchlist: state.watchlist,
        savedMessages: state.savedMessages,
        excludeFilters: state.excludeFilters,
      });
      dispatch({
        type: "hydrate",
        data: {
          broker: normalizeBrokerConfig(loaded.broker, state.broker),
          favourites: loaded.favourites,
          watchlist: loaded.watchlist,
          savedMessages: loaded.savedMessages,
          excludeFilters: ensureDefaultFilters(loaded.excludeFilters),
        },
      });
    };
    void load();
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveAll({
        broker: state.broker,
        favourites: state.favourites,
        watchlist: state.watchlist,
        savedMessages: state.savedMessages,
        excludeFilters: state.excludeFilters,
      });
    }, 250);
  }, [state.broker, state.favourites, state.watchlist, state.savedMessages, state.excludeFilters]);
};
