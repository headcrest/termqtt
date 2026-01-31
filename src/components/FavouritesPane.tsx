import type { SelectOption } from "@opentui/core";
import { paneActiveBackground, paneInactiveBackground } from "../ui/paneTheme";

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
      style={{
        height: "30%",
        borderColor: focused ? "#3b82f6" : "#ffffff",
        backgroundColor: focused ? paneActiveBackground : undefined,
      }}
    >
      <select
        options={options}
        focused={focused}
        selectedIndex={selectedIndex}
        onChange={(index) => onChange(index)}
        onSelect={(index) => onSelect(index)}
        backgroundColor={focused ? paneActiveBackground : paneInactiveBackground}
        focusedBackgroundColor={paneActiveBackground}
        selectedBackgroundColor={focused ? "#2d8cff" : paneInactiveBackground}
        selectedTextColor={focused ? "#0b1220" : "#ffffff"}
        textColor={focused ? "#e2e8f0" : "#ffffff"}
        descriptionColor={focused ? "#9ca3af" : "#ffffff"}
        style={{ height: "100%", width: "100%" }}
      />
    </box>
  );
};
