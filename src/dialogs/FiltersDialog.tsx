import { useCallback, useMemo, useState } from "react";
import type { KeyEvent, SelectOption } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ExcludeFilter } from "../state";
import { useDialog } from "./DialogContext";
import { addFilter, buildFilterOptionName, deleteFilter, editFilter, toggleFilter } from "./filtersLogic";

type FiltersDialogProps = {
  initialFilters: ExcludeFilter[];
  onSave: (filters: ExcludeFilter[]) => void;
};

export const FiltersDialog = ({ initialFilters, onSave }: FiltersDialogProps) => {
  const { closeDialog } = useDialog();
  const [filters, setFilters] = useState<ExcludeFilter[]>(initialFilters.map((f) => ({ ...f })));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [promptMode, setPromptMode] = useState<null | "add" | "edit">(null);
  const [promptValue, setPromptValue] = useState("");

  const options: SelectOption[] = useMemo(
    () =>
      filters.map((filter) => ({
        name: buildFilterOptionName(filter),
        description: "",
      })),
    [filters],
  );

  const openPrompt = (mode: "add" | "edit") => {
    if (mode === "edit") {
      setPromptValue(filters[selectedIndex]?.pattern || "");
    } else {
      setPromptValue("");
    }
    setPromptMode(mode);
  };

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (!key) return false;
      if (key.name === "escape") {
        if (promptMode) {
          setPromptMode(null);
          return true;
        }
        closeDialog();
        return true;
      }

      if (promptMode) {
        if (key.name === "return") {
          const value = promptValue.trim();
          if (value) {
            if (promptMode === "add") {
              setFilters((current) => addFilter(current, value));
            } else {
              setFilters((current) => editFilter(current, selectedIndex, value));
            }
          }
          setPromptValue("");
          setPromptMode(null);
          return true;
        }
        return false;
      }

      if (key.name === "return") {
        onSave(filters);
        closeDialog();
        return true;
      }
      if (key.name === "space") {
        setFilters((current) => toggleFilter(current, selectedIndex));
        return true;
      }
      if (key.name === "a") {
        openPrompt("add");
        return true;
      }
      if (key.name === "e") {
        if (filters[selectedIndex]) openPrompt("edit");
        return true;
      }
      if (key.name === "d") {
        setFilters((current) => deleteFilter(current, selectedIndex));
        return true;
      }
      return false;
    },
    [closeDialog, filters, onSave, promptMode, promptValue, selectedIndex],
  );

  useKeyboard((key) => {
    handleKey(key);
  });

  return (
    <box
      title="Exclude Filters"
      border
      style={{
        position: "absolute",
        width: "60%",
        height: "50%",
        left: "20%",
        top: "25%",
        borderStyle: "double",
        borderColor: "#3b82f6",
        backgroundColor: "#0c1019",
        padding: 1,
        zIndex: 100,
        flexDirection: "column",
        gap: 1,
      }}
    >
      <select
        options={options}
        focused={promptMode === null}
        selectedIndex={selectedIndex}
        onChange={(index) => setSelectedIndex(index)}
        showDescription={false}
        selectedBackgroundColor="#2d8cff"
        selectedTextColor="#0b1220"
        style={{ width: "100%", flexGrow: 1 }}
      />
      <box style={{ flexDirection: "column", gap: 0, height: 4 }}>
        <text
          content={
            promptMode === "edit"
              ? "Edit Filter"
              : promptMode === "add"
                ? "New Filter"
                : "Custom Filter (press a to add)"
          }
          fg={promptMode ? "#93c5fd" : "#94a3b8"}
        />
        <input
          value={promptValue}
          onInput={setPromptValue}
          placeholder={promptMode ? "" : "Type pattern and press Enter"}
          focused={promptMode !== null}
          style={{ focusedBackgroundColor: "#111827" }}
        />
        <text content="Shortcuts: space toggle • a add • e edit • d delete • enter apply • esc close" fg="#64748b" />
      </box>
    </box>
  );
};
