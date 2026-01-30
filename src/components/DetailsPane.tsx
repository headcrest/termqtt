type DetailsPaneProps = {
  title: string;
  content: string;
  focused: boolean;
};

export const DetailsPane = ({ title, content, focused }: DetailsPaneProps) => {
  return (
    <box title={`3 ${title}`} border style={{ flexGrow: 1, borderColor: focused ? "#3b82f6" : "#2a3344" }}>
      <text content={content} fg="#9ca3af" />
    </box>
  );
};
