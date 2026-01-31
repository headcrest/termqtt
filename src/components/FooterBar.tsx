type FooterBarProps = {
  content: string;
};

export const FooterBar = ({ content }: FooterBarProps) => {
  return (
    <box style={{ height: 1, paddingLeft: 1, paddingRight: 1, backgroundColor: "#0f121a" }}>
      <text content={content} fg="#6b7280" />
    </box>
  );
};
