import type { SelectOption } from "@opentui/core";
import { paneActiveBackground, paneInactiveBackground } from "../ui/paneTheme";
import { selectMouseDown } from "../utils/mouseHandlers";

type WatchlistPaneProps = {
  options: SelectOption[];
  selectedIndex: number;
  focused: boolean;
  count: number;
  onChange: (index: number) => void;
};

export const WatchlistPane = ({ options, selectedIndex, focused, count, onChange }: WatchlistPaneProps) => {
  return (
    <box
      title={`[5] Watchlist (${count})`}
      border
      style={{
        height: "100%",
        borderColor: focused ? "#3b82f6" : "#ffffff",
        backgroundColor: focused ? paneActiveBackground : undefined,
      }}
    >
      {options.length === 0 ? (
        <text content="(no watchlist)" fg={focused ? "#9ca3af" : "#ffffff"} />
      ) : (
        <select
          options={options}
          focused={focused}
          selectedIndex={Math.max(0, selectedIndex)}
          onChange={(index) => onChange(index)}
          onMouseDown={selectMouseDown}
          backgroundColor={focused ? paneActiveBackground : paneInactiveBackground}
          focusedBackgroundColor={paneActiveBackground}
          selectedBackgroundColor={focused ? "#2d8cff" : paneInactiveBackground}
          selectedTextColor={focused ? "#0b1220" : "#ffffff"}
          textColor={focused ? "#e2e8f0" : "#ffffff"}
          descriptionColor={focused ? "#9ca3af" : "#ffffff"}
          style={{ height: "100%", width: "100%" }}
        />
      )}
    </box>
  );
};
