import { RGBA, StyledText } from "@opentui/core";
import { jsonColors } from "../ui/jsonColors";
import { paneActiveBackground } from "../ui/paneTheme";

type DetailsPaneProps = {
  title: string;
  content: string;
  isJson: boolean;
  focused: boolean;
};

const jsonStyle = {
  key: RGBA.fromHex(jsonColors.key),
  string: RGBA.fromHex(jsonColors.string),
  number: RGBA.fromHex(jsonColors.number),
  boolean: RGBA.fromHex(jsonColors.boolean),
  null: RGBA.fromHex(jsonColors.null),
  punctuation: RGBA.fromHex(jsonColors.punctuation),
  default: RGBA.fromHex(jsonColors.default),
};

const makeChunk = (text: string, fg?: RGBA) => ({ __isChunk: true as const, text, fg });

const highlightJson = (content: string): StyledText => {
  const chunks = [] as ReturnType<typeof makeChunk>[];
  const text = content ?? "";
  let i = 0;

  const push = (value: string, color?: RGBA) => {
    if (!value) return;
    chunks.push(makeChunk(value, color));
  };

  const readString = () => {
    let j = i + 1;
    let escaped = false;
    while (j < text.length) {
      const char = text[j] ?? "";
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        j += 1;
        break;
      }
      j += 1;
    }
    const value = text.slice(i, j);
    i = j;
    return value;
  };

  const readNumber = () => {
    let j = i;
    const numberRegex = /[-0-9eE+.]/;
    while (j < text.length && numberRegex.test(text[j] ?? "")) j += 1;
    const value = text.slice(i, j);
    i = j;
    return value;
  };

  const isWhitespace = (char: string) => char === " " || char === "\n" || char === "\t" || char === "\r";

  const isKeyString = (startIndex: number, endIndex: number) => {
    let j = endIndex;
    while (j < text.length && isWhitespace(text[j] ?? "")) j += 1;
    return text[j] === ":";
  };

  while (i < text.length) {
    const char = text[i] ?? "";
    if (char === '"') {
      const value = readString();
      const isKey = isKeyString(i - value.length, i);
      push(value, isKey ? jsonStyle.key : jsonStyle.string);
      continue;
    }
    if (char === "-" || (char >= "0" && char <= "9")) {
      const value = readNumber();
      push(value, jsonStyle.number);
      continue;
    }
    if (text.startsWith("true", i)) {
      push("true", jsonStyle.boolean);
      i += 4;
      continue;
    }
    if (text.startsWith("false", i)) {
      push("false", jsonStyle.boolean);
      i += 5;
      continue;
    }
    if (text.startsWith("null", i)) {
      push("null", jsonStyle.null);
      i += 4;
      continue;
    }
    if ("{}[]:,".includes(char)) {
      push(char, jsonStyle.punctuation);
      i += 1;
      continue;
    }
    push(char, jsonStyle.default);
    i += 1;
  }

  return new StyledText(chunks);
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
