# Agent Guide for termqtt

This file orients agentic coding tools working in this repo.
It documents commands, structure, and code style expectations.

## Project summary
- Terminal MQTT client built on `@opentui/react` + `@opentui/core`.
- Entry point: `index.tsx`.
- Main UI: `src/app/App.tsx` + panes in `src/components/**`.
- MQTT logic: `src/mqtt.ts` + `src/hooks/useMqtt.ts`.
- State/reducer: `src/state.ts`, `src/app/reducer.ts`, `src/app/selectors.ts`.

## Tooling requirements
- Use Bun for all commands.
- Avoid Node-only tooling (no npm/yarn/pnpm, no ts-node).
- Bun auto-loads `.env`; do not use dotenv.

## Bun APIs
- Prefer Bun built-ins over Node alternatives:
  - `Bun.file` over `fs.readFile`/`writeFile`.
  - `Bun.serve` for servers (avoid Express).
  - `bun:sqlite`, `Bun.redis`, `Bun.sql` for data access.
  - `WebSocket` is built-in; avoid `ws`.
  - `Bun.$` for shelling out instead of `execa`.

## Build / run / test
Install:
- `bun install`

Run (dev):
- `bun run index.tsx`

Build compiled binary:
- `bun build --compile ./index.tsx --outfile dist/termqtt`

Package zip (local):
- `bun run scripts/package.ts`

Tests:
- `bun test`
- Single test file: `bun test path/to/file.test.ts`
- Single test by name: `bun test -t "test name"`

Lint:
- No lint config detected. If you add one, document here.

## Release packaging (GitHub)
- Workflow: `.github/workflows/release.yml` (zip per OS/arch).
- Release assets include: `termqtt` binary + `parser.worker.js`.

## Runtime worker (TreeSitter)
- The compiled binary requires `parser.worker.js` beside the executable.
- `index.tsx` sets `OTUI_TREE_SITTER_WORKER_PATH` to the local worker.

## Versioning
- UI version: `src/version.ts` (`APP_VERSION`).
- Package version: `package.json` (`version`).
- Keep them aligned.

## Config and persistence
- Config directory: `~/.config/termqtt` (or `$XDG_CONFIG_HOME`).
- Files: see `src/storage.ts` (`storageFiles`).

## Code style
General
- TypeScript strict mode is enabled.
- Prefer simple, explicit types for state and props.
- Avoid any implicit `any` or loose casts unless necessary.

Imports
- Use ES module imports.
- Keep import order: external libs, then local modules.
- Prefer `node:` prefix for Node built-ins.

Formatting
- Use double quotes for strings.
- Trailing commas on multi-line objects/arrays.
- Keep functions small and single-purpose.

Naming
- Components: PascalCase (`PayloadPane`).
- Hooks: `useX`.
- Variables: camelCase.
- Constants: UPPER_SNAKE_CASE when truly constant.

Error handling
- Guard for null key events in keyboard handlers.
- Avoid crashing dialogs; return `false` when unhandled.
- When parsing JSON, always handle errors and show fallback text.

UI patterns
- Active pane borders: blue (`#3b82f6`).
- Inactive pane borders: white.
- Active pane background: `paneActiveBackground`.
- JSON colors: use `src/ui/jsonColors.ts` and `src/ui/jsonHighlight.ts`.
- Payload table keys use `jsonColors.key`.

Keyboard behavior
- Tab/Shift+Tab cycle fields in dialogs.
- Pane shortcuts are handled in `src/hooks/useKeyboardShortcuts.ts`.
- Keep shortcuts consistent with footer (`FooterBar`) and Help dialog.

Status bar
- Single line with app name/version first.
- Status color: green if CONNECTED, red otherwise.
- Search active: orange, excludes active: red.

Selectors
- Build derived UI data in `src/app/selectors.ts`.
- Keep selectors pure (no side effects).

State updates
- Use reducer actions (`dispatch({ type: "set", data: ... })`).
- Avoid direct state mutation.

MQTT
- Client ID built in `src/mqtt.ts` uses host + pid.
- Use MQTT wildcards and substring logic for filters (see selectors).

Dialogs
- Use `useKeyboard` in dialogs to handle key events.
- Avoid `setDialogHandler` patterns (legacy and brittle).
- Dialogs should be centered and readable.

Tables and lists
- Use `select` for list panes.
- When list is empty, render a placeholder instead of stale select rows.

Message dialog
- New/Edit payload uses key/value table (not raw JSON textarea).
- Preview uses `highlightJson` for colorized JSON.
- Saved list styling should match favourites list.

Packaging scripts
- `scripts/package.ts` builds zip for current OS/arch.
- `scripts/install.sh` and `scripts/install.ps1` install zips.

## External rules
- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No Copilot instructions found in `.github/copilot-instructions.md`.

## Agent etiquette
- Prefer small, incremental edits.
- Keep UI behavior consistent with existing panes and dialogs.
- Update docs/shortcuts when adding new hotkeys.
