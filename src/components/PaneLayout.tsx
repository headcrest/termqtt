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
  onPayloadFocus: () => void;
  onWatchChange: (index: number) => void;
  detailsTitle: string;
  detailsContent: string;
  detailsIsJson: boolean;
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
  onPayloadFocus,
  onWatchChange,
  detailsTitle,
  detailsContent,
  detailsIsJson,
}: PaneLayoutProps) => {
  return (
    <box style={{ flexGrow: 1, flexDirection: "column", gap: 1, padding: 1 }}>
      <box style={{ height: "70%", flexDirection: "row", gap: 1 }}>
        <box style={{ width: 36 }}>
          <TopicsPane
            options={topicsOptions}
            selectedIndex={selectedTopicIndex}
            focused={activePane === "topics"}
            count={topicsCount}
            onChange={onTopicChange}
            onSelect={onTopicSelect}
          />
        </box>
        <box style={{ flexGrow: 1 }}>
          <PayloadPane
            entries={payloadEntries}
            selectedIndex={selectedPayloadIndex}
            focused={activePane === "payload"}
            count={payloadCount}
            onChange={onPayloadChange}
            onFocus={onPayloadFocus}
          />
        </box>
        <box style={{ flexGrow: 1 }}>
          <DetailsPane
            title={detailsTitle}
            content={detailsContent}
            isJson={detailsIsJson}
            focused={activePane === "details"}
          />
        </box>
      </box>
      <box style={{ height: "30%", flexDirection: "row", gap: 1 }}>
        <box style={{ width: 36 }}>
          <FavouritesPane
            options={favouritesOptions}
            selectedIndex={selectedFavouriteIndex}
            focused={activePane === "favourites"}
            count={favouritesCount}
            onChange={onFavouriteChange}
            onSelect={onFavouriteSelect}
          />
        </box>
        <box style={{ flexGrow: 1 }}>
          <WatchlistPane
            options={watchOptions}
            selectedIndex={selectedWatchIndex}
            focused={activePane === "watchlist"}
            count={watchCount}
            onChange={onWatchChange}
          />
        </box>
      </box>
    </box>
  );
};
