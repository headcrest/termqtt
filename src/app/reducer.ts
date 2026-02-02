import type { AppState, TopicMessage } from "../state";
import { parseJson } from "../json";

export type Action =
  | { type: "hydrate"; data: Partial<AppState> }
  | { type: "status"; status: AppState["connectionStatus"]; error?: string }
  | { type: "subscription"; filter: string; info: string }
  | { type: "message"; topic: string; payload: string }
  | { type: "set"; data: Partial<AppState> };

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.data };
    case "status":
      return {
        ...state,
        connectionStatus: action.status,
        connectionError: action.error,
      };
    case "subscription":
      return {
        ...state,
        lastSubscription: action.filter,
        subscriptionInfo: action.info,
      };
    case "message": {
      if (state.updatesPaused) return state;
      const parsed = parseJson(action.payload);
      const nextMessages: Record<string, TopicMessage> = {
        ...state.messages,
        [action.topic]: {
          topic: action.topic,
          payload: action.payload,
          json: parsed.ok ? parsed.value : undefined,
          error: parsed.ok ? undefined : parsed.error,
          receivedAt: Date.now(),
        },
      };
      const topics = state.topics.includes(action.topic)
        ? state.topics
        : [...state.topics, action.topic].sort();
      return {
        ...state,
        messages: nextMessages,
        topics,
        messageCount: state.messageCount + 1,
        lastMessageTopic: action.topic,
        lastMessageAt: Date.now(),
      };
    }
    case "set":
      return { ...state, ...action.data };
    default:
      return state;
  }
};
