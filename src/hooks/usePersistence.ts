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
          broker: loaded.broker,
          favourites: loaded.favourites,
          watchlist: loaded.watchlist,
          savedMessages: loaded.savedMessages,
          excludeFilters: loaded.excludeFilters,
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
