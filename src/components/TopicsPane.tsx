import type { SelectOption } from "@opentui/core";

type TopicsPaneProps = {
  options: SelectOption[];
  selectedIndex: number;
  focused: boolean;
  count: number;
  onChange: (index: number) => void;
};

export const TopicsPane = ({ options, selectedIndex, focused, count, onChange }: TopicsPaneProps) => {
  return (
    <box title={`Topics (${count})`} border style={{ flexGrow: 1, borderColor: focused ? "#3b82f6" : "#2a3344" }}>
      <select
        options={options}
        focused={focused}
        selectedIndex={selectedIndex}
        onChange={(index) => onChange(index)}
        showDescription={false}
        selectedBackgroundColor="#2d8cff"
        selectedTextColor="#0b1220"
        style={{ height: "100%", width: "100%" }}
      />
    </box>
  );
};
