import type { SelectOption } from "@opentui/core";

type FavouritesPaneProps = {
  options: SelectOption[];
  selectedIndex: number;
  focused: boolean;
  count: number;
  onChange: (index: number) => void;
  onSelect: (index: number) => void;
};

export const FavouritesPane = ({
  options,
  selectedIndex,
  focused,
  count,
  onChange,
  onSelect,
}: FavouritesPaneProps) => {
  return (
    <box
      title={`4 Favourites (${count})`}
      border
      style={{ height: "30%", borderColor: focused ? "#3b82f6" : "#2a3344" }}
    >
      <select
        options={options}
        focused={focused}
        selectedIndex={selectedIndex}
        onChange={(index) => onChange(index)}
        onSelect={(index) => onSelect(index)}
        selectedBackgroundColor="#f59e0b"
        selectedTextColor="#0b1220"
        style={{ height: "100%", width: "100%" }}
      />
    </box>
  );
};
