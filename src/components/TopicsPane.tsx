import type { SelectOption } from "@opentui/core";
import { paneActiveBackground } from "../ui/paneTheme";

type TopicsPaneProps = {
  options: SelectOption[];
  selectedIndex: number;
  focused: boolean;
  count: number;
  onChange: (index: number) => void;
  onSelect: (index: number) => void;
};

export const TopicsPane = ({
  options,
  selectedIndex,
  focused,
  count,
  onChange,
  onSelect,
}: TopicsPaneProps) => {
  return (
    <box
      title={`1 Topics (${count})`}
      border
      style={{
        height: "70%",
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
        showDescription={false}
        backgroundColor={focused ? paneActiveBackground : undefined}
        focusedBackgroundColor={paneActiveBackground}
        selectedBackgroundColor="#2d8cff"
        selectedTextColor={focused ? "#0b1220" : "#ffffff"}
        textColor={focused ? "#e2e8f0" : "#ffffff"}
        style={{ height: "100%", width: "100%" }}
      />
    </box>
  );
};
