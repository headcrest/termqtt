import { flattenJson, formatValue, prettyJson } from "../json";
import type { AppState, ExcludeFilter, TopicMessage } from "../state";

const matchTopicFilter = (topic: string, filter: string): boolean => {
  if (filter === "#") return true;
  const filterLevels = filter.split("/");
  const topicLevels = topic.split("/");
  for (let i = 0; i < filterLevels.length; i += 1) {
    const part = filterLevels[i];
    if (part === "#") return true;
    if (i >= topicLevels.length) return false;
    if (part === "+") continue;
    if (part !== topicLevels[i]) return false;
  }
  return filterLevels.length === topicLevels.length;
};

const getFilteredTopics = (topics: string[], filters: ExcludeFilter[], query: string) => {
  const activeFilters = filters.filter((filter) => filter.enabled && filter.pattern.trim().length > 0);
  const lowered = query.toLowerCase();
  return topics.filter((topic) => {
    if (lowered && !topic.toLowerCase().includes(lowered)) return false;
    for (const filter of activeFilters) {
      if (matchTopicFilter(topic, filter.pattern)) return false;
    }
    return true;
  });
};

type TopicNode = {
  name: string;
  path: string;
  children: Map<string, TopicNode>;
};

const buildTopicTree = (topics: string[]) => {
  const root: TopicNode = { name: "", path: "", children: new Map() };
  for (const topic of topics) {
    const parts = topic.split("/").filter((part) => part.length > 0);
    let node = root;
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, path: currentPath, children: new Map() });
      }
      node = node.children.get(part)!;
    }
  }
  return root;
};

const findTopicNode = (root: TopicNode, path: string) => {
  if (!path) return root;
  const parts = path.split("/").filter((part) => part.length > 0);
  let node = root;
  for (const part of parts) {
    const next = node.children.get(part);
    if (!next) return null;
    node = next;
  }
  return node;
};

const getFirstLeafPath = (node: TopicNode) => {
  let current = node;
  while (current.children.size > 0) {
    const children = Array.from(current.children.values()).sort((a, b) => a.name.localeCompare(b.name));
    const next = children[0];
    if (!next) break;
    current = next;
  }
  return current.path;
};

export type TopicEntry = {
  path: string;
  label: string;
  depth: number;
  hasChildren: boolean;
};

export const getTopicTreeEntries = (
  state: AppState,
): { entries: TopicEntry[]; topicPaths: string[] } => {
  const filtered = getFilteredTopics(state.topics, state.excludeFilters, state.searchQuery);
  const tree = buildTopicTree(filtered);
  const entries: TopicEntry[] = [];
  const topicPaths: string[] = [];

  const walk = (node: TopicNode, depth: number) => {
    const children = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      const hasChildren = child.children.size > 0;
      const expanded = state.topicExpansion[child.path] ?? depth === 0;
      const indent = "  ".repeat(depth);
      const marker = hasChildren ? (expanded ? "- " : "+ ") : "  ";
      const label = `${indent}${marker}${child.name}`;
      entries.push({ path: child.path, label, depth, hasChildren });
      topicPaths.push(child.path);
      if (hasChildren && expanded) walk(child, depth + 1);
    }
  };

  walk(tree, 0);
  return { entries, topicPaths };
};

export const getFirstLeafTopicPath = (state: AppState, parentPath: string) => {
  const filtered = getFilteredTopics(state.topics, state.excludeFilters, state.searchQuery);
  const tree = buildTopicTree(filtered);
  const node = findTopicNode(tree, parentPath);
  if (!node) return null;
  return getFirstLeafPath(node);
};

export const getPayloadEntries = (message?: TopicMessage) => {
  if (!message) return [] as Array<{ path: string; value: unknown; type: string }>;
  if (message.json !== undefined) {
    return flattenJson(message.json).map((entry) => ({ path: entry.path, value: entry.value, type: entry.type }));
  }
  if (message.error) {
    return [
      { path: "error", value: `JSON parse error: ${message.error}`, type: "string" },
      { path: "raw", value: message.payload, type: "string" },
    ];
  }
  return [{ path: "raw", value: message.payload, type: "string" }];
};

export const getWatchOptions = (state: AppState) => {
  return state.watchlist.map((entry) => {
    const msg = state.messages[entry.topic];
    let value = "";
    if (msg?.json !== undefined) {
      const flattened = flattenJson(msg.json).find((item) => item.path === entry.path);
      value = flattened ? formatValue(flattened.value) : "";
    }
    return {
      name: `${entry.topic}:${entry.path}`,
      description: value,
    };
  });
};

export const getStatusLines = (state: AppState) => {
  const status = state.connectionStatus.toUpperCase();
  const host = `${state.broker.host}:${state.broker.port}`;
  const filter = state.broker.topicFilter || "#";
  const search = state.searchQuery ? `search:${state.searchQuery}` : "search:off";
  const excludes = state.excludeFilters.filter((f) => f.enabled).length;
  const error = state.connectionError ? `error:${state.connectionError}` : "";
  const total = `messages:${state.messageCount}`;
  const line1 = `${status}  broker:${host}  filter:${filter}  ${search}`.trim();
  const debug = state.debugKeys && state.lastKeyDebug ? `key:${state.lastKeyDebug}` : "";
  const line2 = `${total}  excludes:${excludes} ${error} ${debug}`.trim();
  return { line1, line2 };
};

export const getDetailsContent = (message?: TopicMessage) => {
  if (!message) return { content: "No message selected", isJson: false };
  if (message.json !== undefined) return { content: prettyJson(message.json), isJson: true };
  return { content: message.payload, isJson: false };
};
