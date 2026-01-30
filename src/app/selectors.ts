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

export const getVisibleTopics = (topics: string[], filters: ExcludeFilter[], query: string) => {
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

export const getSelectedMessage = (state: AppState, visibleTopics: string[]) => {
  const selectedTopic = visibleTopics[state.selectedTopicIndex];
  return selectedTopic ? state.messages[selectedTopic] : undefined;
};

export const getPayloadEntries = (message?: TopicMessage) => {
  if (!message) return [] as Array<{ path: string; value: unknown }>;
  if (message.json !== undefined) {
    return flattenJson(message.json).map((entry) => ({ path: entry.path, value: entry.value }));
  }
  return [{ path: "payload", value: message.payload }];
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
  const lastTopic = state.lastMessageTopic ? `last:${state.lastMessageTopic}` : "last:none";
  const total = `messages:${state.messageCount}`;
  const sub = state.subscriptionInfo
    ? `sub:${state.lastSubscription || "-"} ${state.subscriptionInfo}`
    : `sub:${state.lastSubscription || "-"}`;
  const line1 = `${status}  broker:${host}  filter:${filter}  ${search}`.trim();
  const line2 = `${total}  ${lastTopic}  ${sub}  excludes:${excludes} ${error}`.trim();
  return { line1, line2 };
};

export const getDetailsText = (message?: TopicMessage) => {
  if (!message) return "No message selected";
  if (message.json !== undefined) return prettyJson(message.json);
  return message.payload;
};
