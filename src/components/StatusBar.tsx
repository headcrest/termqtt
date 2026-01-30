export const StatusBar = ({ line1, line2 }: { line1: string; line2: string }) => {
  return (
    <box style={{ height: 2, paddingLeft: 1, paddingRight: 1, backgroundColor: "#141824", flexDirection: "column" }}>
      <text content={line1} fg="#9ca3af" />
      <text content={line2} fg="#9ca3af" />
    </box>
  );
};
