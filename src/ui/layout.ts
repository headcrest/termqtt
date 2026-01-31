import {
  BoxRenderable,
  ScrollBoxRenderable,
  SelectRenderable,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core";

export type UiRefs = {
  root: BoxRenderable;
  statusText: TextRenderable;
  statusText2: TextRenderable;
  topicsBox: BoxRenderable;
  favouritesBox: BoxRenderable;
  payloadBox: BoxRenderable;
  watchBox: BoxRenderable;
  detailsBox: BoxRenderable;
  topicsList: SelectRenderable;
  favouritesList: SelectRenderable;
  payloadList: SelectRenderable;
  watchList: SelectRenderable;
  detailsScroll: ScrollBoxRenderable;
  detailsText: TextRenderable;
};

export const createLayout = (renderer: CliRenderer): UiRefs => {
  const root = new BoxRenderable(renderer, {
    id: "root",
    width: "100%",
    height: "100%",
    flexDirection: "column",
    backgroundColor: "#0f1117",
  });

  const statusBar = new BoxRenderable(renderer, {
    id: "status-bar",
    height: 2,
    paddingLeft: 1,
    paddingRight: 1,
    backgroundColor: "#141824",
    flexDirection: "column",
  });

  const statusText = new TextRenderable(renderer, {
    id: "status-text",
    content: "Disconnected",
    fg: "#9ca3af",
  });

  const statusText2 = new TextRenderable(renderer, {
    id: "status-text-2",
    content: "",
    fg: "#9ca3af",
  });

  statusBar.add(statusText);
  statusBar.add(statusText2);

  const contentRow = new BoxRenderable(renderer, {
    id: "content-row",
    flexDirection: "row",
    flexGrow: 1,
    gap: 1,
    padding: 1,
  });

  const topicsBox = new BoxRenderable(renderer, {
    id: "topics-box",
    width: 30,
    flexDirection: "column",
    flexGrow: 7,
    border: true,
    borderStyle: "single",
    borderColor: "#2a3344",
    title: "Topics",
  });

  const favouritesBox = new BoxRenderable(renderer, {
    id: "favourites-box",
    flexGrow: 3,
    border: true,
    borderStyle: "single",
    borderColor: "#2a3344",
    title: "Favourites",
  });

  const leftColumn = new BoxRenderable(renderer, {
    id: "left-column",
    flexDirection: "column",
    gap: 1,
    width: 30,
  });

  const payloadBox = new BoxRenderable(renderer, {
    id: "payload-box",
    flexGrow: 7,
    border: true,
    borderStyle: "single",
    borderColor: "#2a3344",
    title: "Payload",
  });

  const watchBox = new BoxRenderable(renderer, {
    id: "watch-box",
    flexGrow: 3,
    border: true,
    borderStyle: "single",
    borderColor: "#2a3344",
    title: "Watchlist",
  });

  const middleColumn = new BoxRenderable(renderer, {
    id: "middle-column",
    flexDirection: "column",
    gap: 1,
    width: 50,
  });

  const detailsBox = new BoxRenderable(renderer, {
    id: "details-box",
    flexGrow: 1,
    border: true,
    borderStyle: "single",
    borderColor: "#2a3344",
    title: "Details",
  });

  const detailsScroll = new ScrollBoxRenderable(renderer, {
    id: "details-scroll",
    width: "100%",
    height: "100%",
    scrollY: true,
  });

  const detailsText = new TextRenderable(renderer, {
    id: "details-text",
    content: "No message selected",
    fg: "#9ca3af",
  });

  detailsScroll.add(detailsText);
  detailsBox.add(detailsScroll);

  const topicsList = new SelectRenderable(renderer, {
    id: "topics-list",
    width: "100%",
    height: "100%",
    options: [],
    showDescription: false,
    selectedBackgroundColor: "#2d8cff",
    selectedTextColor: "#0b1220",
  });

  const favouritesList = new SelectRenderable(renderer, {
    id: "favourites-list",
    width: "100%",
    height: "100%",
    options: [],
    selectedBackgroundColor: "#f59e0b",
    selectedTextColor: "#0b1220",
  });

  const payloadList = new SelectRenderable(renderer, {
    id: "payload-list",
    width: "100%",
    height: "100%",
    options: [],
    selectedBackgroundColor: "#34d399",
    selectedTextColor: "#0b1220",
  });

  const watchList = new SelectRenderable(renderer, {
    id: "watch-list",
    width: "100%",
    height: "100%",
    options: [],
    selectedBackgroundColor: "#f472b6",
    selectedTextColor: "#0b1220",
  });

  topicsBox.add(topicsList);
  favouritesBox.add(favouritesList);
  payloadBox.add(payloadList);
  watchBox.add(watchList);

  leftColumn.add(topicsBox);
  leftColumn.add(favouritesBox);
  middleColumn.add(payloadBox);
  middleColumn.add(watchBox);

  contentRow.add(leftColumn);
  contentRow.add(middleColumn);
  contentRow.add(detailsBox);

  root.add(statusBar);
  root.add(contentRow);

  renderer.root.add(root);

  return {
    root,
    statusText,
    statusText2,
    topicsBox,
    favouritesBox,
    payloadBox,
    watchBox,
    detailsBox,
    topicsList,
    favouritesList,
    payloadList,
    watchList,
    detailsScroll,
    detailsText,
  };
};
