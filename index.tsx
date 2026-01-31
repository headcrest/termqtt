import { createCliRenderer, getTreeSitterClient } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./src/app/App";

const renderer = await createCliRenderer({ exitOnCtrlC: true });
const treeSitter = getTreeSitterClient();
await treeSitter.initialize();
createRoot(renderer).render(<App />);
