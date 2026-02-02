import { describe, expect, test } from "bun:test";
import { handleKeyboardShortcut } from "../src/hooks/keyboardLogic";
import { createInitialState } from "../src/state";

const makeContext = () => {
  const state = createInitialState();
  const actions: any[] = [];
  const dialogs: string[] = [];
  return {
    state,
    actions,
    dialogs,
    context: {
      state,
      dispatch: (action: any) => actions.push(action),
      topicEntries: [] as Array<{ path: string; depth: number; hasChildren: boolean }>,
      topicPaths: [] as string[],
      payloadEntries: [] as Array<{ path: string; value: unknown; type: string }>,
      activeDialog: false,
      dialogHandler: undefined,
      openDialog: (dialog: { type: string }) => dialogs.push(dialog.type),
      destroyRenderer: () => undefined,
      exit: () => undefined,
    },
  };
};

describe("keyboard shortcuts", () => {
  test("p toggles updatesPaused", () => {
    const { context, actions } = makeContext();
    handleKeyboardShortcut({ name: "p" } as any, context);
    expect(actions[0]?.data?.updatesPaused).toBe(true);
  });

  test("f opens filters dialog", () => {
    const { context, dialogs } = makeContext();
    handleKeyboardShortcut({ name: "f" } as any, context);
    expect(dialogs[0]).toBe("filters");
  });

  test("/ opens search dialog", () => {
    const { context, dialogs } = makeContext();
    handleKeyboardShortcut({ name: "/" } as any, context);
    expect(dialogs[0]).toBe("search");
  });

  test("? opens help dialog", () => {
    const { context, dialogs } = makeContext();
    handleKeyboardShortcut({ name: "?" } as any, context);
    expect(dialogs[0]).toBe("help");
  });

  test("b opens broker dialog", () => {
    const { context, dialogs } = makeContext();
    handleKeyboardShortcut({ name: "b" } as any, context);
    expect(dialogs[0]).toBe("broker");
  });

  test("q calls exit", () => {
    const { context } = makeContext();
    let exitCode: number | undefined;
    context.exit = (code?: number) => {
      exitCode = code;
    };
    handleKeyboardShortcut({ name: "q" } as any, context);
    expect(exitCode).toBe(0);
  });

  test("n opens new dialog", () => {
    const { context, dialogs } = makeContext();
    handleKeyboardShortcut({ name: "n" } as any, context);
    expect(dialogs[0]).toBe("new");
  });

  test("space removes last favourite", () => {
    const { context, actions } = makeContext();
    context.state.activePane = "favourites";
    context.state.favourites = [{ topic: "a" }];
    context.state.selectedFavouriteIndex = 0;
    handleKeyboardShortcut({ name: "space" } as any, context);
    expect(actions[0]?.data?.favourites).toEqual([]);
    expect(actions[0]?.data?.selectedFavouriteIndex).toBe(-1);
  });

  test("space removes last watchlist", () => {
    const { context, actions } = makeContext();
    context.state.activePane = "watchlist";
    context.state.watchlist = [{ topic: "a", path: "b" }];
    context.state.selectedWatchIndex = 0;
    handleKeyboardShortcut({ name: "space" } as any, context);
    expect(actions[0]?.data?.watchlist).toEqual([]);
    expect(actions[0]?.data?.selectedWatchIndex).toBe(-1);
  });

  test("tab cycles panes", () => {
    const { context, actions } = makeContext();
    context.state.activePane = "topics";
    handleKeyboardShortcut({ name: "tab" } as any, context);
    expect(actions[0]?.data?.activePane).toBe("payload");
  });

  test("shift+tab cycles panes backward", () => {
    const { context, actions } = makeContext();
    context.state.activePane = "topics";
    handleKeyboardShortcut({ name: "backtab" } as any, context);
    expect(actions[0]?.data?.activePane).toBe("watchlist");
  });

  test("number keys jump to panes", () => {
    const { context, actions } = makeContext();
    handleKeyboardShortcut({ name: "3" } as any, context);
    expect(actions[0]?.data?.activePane).toBe("details");
  });

  test("space toggles favourite from topics", () => {
    const { context, actions } = makeContext();
    context.state.activePane = "topics";
    context.topicEntries = [{ path: "a", depth: 0, hasChildren: false }];
    context.topicPaths = ["a"];
    context.state.selectedTopicIndex = 0;
    handleKeyboardShortcut({ name: "space" } as any, context);
    expect(actions[0]?.data?.favourites).toEqual([{ topic: "a" }]);
  });

  test("space does nothing on topic groups", () => {
    const { context, actions } = makeContext();
    context.state.activePane = "topics";
    context.topicEntries = [{ path: "a", depth: 0, hasChildren: true }];
    context.topicPaths = ["a"];
    handleKeyboardShortcut({ name: "space" } as any, context);
    expect(actions.length).toBe(0);
  });

  test("space toggles watchlist from payload", () => {
    const { context, actions } = makeContext();
    context.state.activePane = "payload";
    context.topicPaths = ["t"];
    context.payloadEntries = [{ path: "a", value: 1, type: "number" }];
    handleKeyboardShortcut({ name: "space" } as any, context);
    expect(actions[0]?.data?.watchlist).toEqual([{ topic: "t", path: "a" }]);
  });

  test("e opens edit only in details pane", () => {
    const { context, dialogs } = makeContext();
    context.state.activePane = "details";
    handleKeyboardShortcut({ name: "e" } as any, context);
    expect(dialogs[0]).toBe("edit");
  });

  test("expand selects first leaf", () => {
    const { context, actions } = makeContext();
    context.state.activePane = "topics";
    context.state.topics = ["a/b", "a/c"];
    context.topicEntries = [{ path: "a", depth: 0, hasChildren: true }];
    context.topicPaths = ["a"];
    context.state.selectedTopicIndex = 0;
    context.state.topicExpansion = { a: false };
    handleKeyboardShortcut({ name: "l" } as any, context);
    const action = actions.find((entry) => entry.data?.topicExpansion?.a === true);
    expect(action).toBeTruthy();
    expect(typeof action?.data?.selectedTopicIndex).toBe("number");
  });

  test("collapse moves selection to parent", () => {
    const { context, actions } = makeContext();
    context.state.activePane = "topics";
    context.state.topics = ["a/b"];
    context.topicEntries = [{ path: "a/b", depth: 1, hasChildren: false }];
    context.topicPaths = ["a/b"];
    context.state.selectedTopicIndex = 0;
    handleKeyboardShortcut({ name: "h" } as any, context);
    expect(actions[0]?.data?.topicExpansion?.["a"]).toBe(false);
  });
});
