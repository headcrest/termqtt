import type { SelectOption } from "@opentui/core";

type PayloadPaneProps = {
  options: SelectOption[];
  selectedIndex: number;
  focused: boolean;
  count: number;
  onChange: (index: number) => void;
};

export const PayloadPane = ({ options, selectedIndex, focused, count, onChange }: PayloadPaneProps) => {
  return (
    <box title={`2 Payload (${count})`} border style={{ flexGrow: 2, borderColor: focused ? "#3b82f6" : "#2a3344" }}>
      <select
        options={options}
        focused={focused}
        selectedIndex={selectedIndex}
        onChange={(index) => onChange(index)}
        selectedBackgroundColor="#34d399"
        selectedTextColor="#0b1220"
        style={{ height: "100%", width: "100%" }}
      />
    </box>
  );
};
