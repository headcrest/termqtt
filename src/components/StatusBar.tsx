type StatusBarProps = {
  status: string;
  host: string;
  search: string;
  searchActive: boolean;
  excludes: string;
  excludesActive: boolean;
  error: string;
  debug: string;
};

export const StatusBar = ({
  status,
  host,
  search,
  searchActive,
  excludes,
  excludesActive,
  error,
  debug,
}: StatusBarProps) => {
  return (
    <box style={{ height: 1, paddingLeft: 1, paddingRight: 1, backgroundColor: "#141824", flexDirection: "row", gap: 2 }}>
      <text content={status} fg={status === "CONNECTED" ? "#22c55e" : "#ef4444"} />
      <text content={`broker:${host}`} fg="#9ca3af" />
      <text content={search} fg={searchActive ? "#f59e0b" : "#9ca3af"} />
      <text content={excludes} fg={excludesActive ? "#ef4444" : "#9ca3af"} />
      {error ? <text content={error} fg="#ef4444" /> : null}
      {debug ? <text content={debug} fg="#93c5fd" /> : null}
    </box>
  );
};
