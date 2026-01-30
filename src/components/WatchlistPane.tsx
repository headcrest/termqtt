import type { SelectOption } from "@opentui/core";

type WatchlistPaneProps = {
  options: SelectOption[];
  selectedIndex: number;
  focused: boolean;
  count: number;
  onChange: (index: number) => void;
};

export const WatchlistPane = ({ options, selectedIndex, focused, count, onChange }: WatchlistPaneProps) => {
  return (
    <box title={`5 Watchlist (${count})`} border style={{ flexGrow: 1, borderColor: focused ? "#3b82f6" : "#2a3344" }}>
      <select
        options={options}
        focused={focused}
        selectedIndex={selectedIndex}
        onChange={(index) => onChange(index)}
        selectedBackgroundColor="#f472b6"
        selectedTextColor="#0b1220"
        style={{ height: "100%", width: "100%" }}
      />
    </box>
  );
};
