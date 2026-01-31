import { highlightJson } from "../ui/jsonHighlight";
import { paneActiveBackground } from "../ui/paneTheme";

type DetailsPaneProps = {
  title: string;
  content: string;
  isJson: boolean;
  focused: boolean;
};


export const DetailsPane = ({ title, content, isJson, focused }: DetailsPaneProps) => {
  return (
    <box
      title={`3 ${title}`}
      border
      style={{
        flexGrow: 1,
        borderColor: focused ? "#3b82f6" : "#ffffff",
        backgroundColor: focused ? paneActiveBackground : undefined,
      }}
    >
      <scrollbox style={{ flexGrow: 1, width: "100%" }} scrollY focused={focused}>
        {isJson ? <text content={highlightJson(content)} /> : <text content={content} fg={focused ? "#9ca3af" : "#ffffff"} />}
      </scrollbox>
    </box>
  );
};
