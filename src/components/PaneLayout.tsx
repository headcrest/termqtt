import type { SelectOption } from "@opentui/core";
import { DetailsPane } from "./DetailsPane";
import { FavouritesPane } from "./FavouritesPane";
import { PayloadPane } from "./PayloadPane";
import { TopicsPane } from "./TopicsPane";
import { WatchlistPane } from "./WatchlistPane";
import type { Pane } from "../state";

type PaneLayoutProps = {
  activePane: Pane;
  topicsOptions: SelectOption[];
  favouritesOptions: SelectOption[];
  payloadEntries: Array<{ path: string; value: unknown; type: string }>;
  watchOptions: SelectOption[];
  topicsCount: number;
  favouritesCount: number;
  payloadCount: number;
  watchCount: number;
  selectedTopicIndex: number;
  selectedFavouriteIndex: number;
  selectedPayloadIndex: number;
  selectedWatchIndex: number;
  onTopicChange: (index: number) => void;
  onTopicSelect: (index: number) => void;
  onFavouriteChange: (index: number) => void;
  onFavouriteSelect: (index: number) => void;
  onPayloadChange: (index: number) => void;
  onWatchChange: (index: number) => void;
  detailsTitle: string;
  detailsContent: string;
};

export const PaneLayout = ({
  activePane,
  topicsOptions,
  favouritesOptions,
  payloadEntries,
  watchOptions,
  topicsCount,
  favouritesCount,
  payloadCount,
  watchCount,
  selectedTopicIndex,
  selectedFavouriteIndex,
  selectedPayloadIndex,
  selectedWatchIndex,
  onTopicChange,
  onTopicSelect,
  onFavouriteChange,
  onFavouriteSelect,
  onPayloadChange,
  onWatchChange,
  detailsTitle,
  detailsContent,
}: PaneLayoutProps) => {
  return (
    <box style={{ flexGrow: 1, flexDirection: "row", gap: 1, padding: 1 }}>
      <box style={{ width: 30, flexDirection: "column", gap: 1, height: "100%" }}>
        <TopicsPane
          options={topicsOptions}
          selectedIndex={selectedTopicIndex}
          focused={activePane === "topics"}
          count={topicsCount}
          onChange={onTopicChange}
          onSelect={onTopicSelect}
        />
        <FavouritesPane
          options={favouritesOptions}
          selectedIndex={selectedFavouriteIndex}
          focused={activePane === "favourites"}
          count={favouritesCount}
          onChange={onFavouriteChange}
          onSelect={onFavouriteSelect}
        />
      </box>
      <box style={{ width: 50, flexDirection: "column", gap: 1, height: "100%" }}>
        <PayloadPane
          entries={payloadEntries}
          selectedIndex={selectedPayloadIndex}
          focused={activePane === "payload"}
          count={payloadCount}
          onChange={onPayloadChange}
        />
        <WatchlistPane
          options={watchOptions}
          selectedIndex={selectedWatchIndex}
          focused={activePane === "watchlist"}
          count={watchCount}
          onChange={onWatchChange}
        />
      </box>
      <DetailsPane title={detailsTitle} content={detailsContent} focused={activePane === "details"} />
    </box>
  );
};
