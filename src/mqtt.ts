import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import type { BrokerConfig } from "./state";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export type MqttHandlers = {
  onStatus: (status: ConnectionStatus, error?: string) => void;
  onMessage: (topic: string, payload: string) => void;
  onSubscription: (filter: string, info: string) => void;
};

const buildUrl = (config: BrokerConfig) => {
  const protocol = config.tls ? "mqtts" : "mqtt";
  return `${protocol}://${config.host}:${config.port}`;
};

const buildOptions = (config: BrokerConfig): IClientOptions => ({
  clientId: config.clientId || `termqtt2-${Math.random().toString(16).slice(2)}`,
  username: config.username || undefined,
  password: config.password || undefined,
  reconnectPeriod: 1000,
  keepalive: 30,
});

export class MqttManager {
  private client: MqttClient | null = null;
  private handlers: MqttHandlers;
  private config: BrokerConfig;

  constructor(config: BrokerConfig, handlers: MqttHandlers) {
    this.config = config;
    this.handlers = handlers;
  }

  connect() {
    this.handlers.onStatus("connecting");
    const url = buildUrl(this.config);
    const options = buildOptions(this.config);
    const client = mqtt.connect(url, options);
    this.client = client;

    client.on("connect", () => {
      this.handlers.onStatus("connected");
      const filter = this.config.topicFilter || "#";
      client.subscribe(filter, { qos: this.config.qos }, (error, granted, packet) => {
        const details: string[] = [];
        const err = error as { message?: string; reasonCode?: number; reasonCodeKey?: string; code?: string } | null;

        if (granted && granted.length > 0) {
          const summary = granted.map((item) => `${item.topic}:${item.qos}`).join(", ");
          details.push(`granted:${summary}`);
          const rejected = granted.filter((item) => item.qos === 128);
          if (rejected.length > 0) details.push("rejected:yes");
        } else if (!error) {
          details.push("granted:none");
        }

        if (err) {
          if (err.reasonCode !== undefined) details.push(`rc:${err.reasonCode}`);
          if (err.reasonCodeKey) details.push(`reason:${err.reasonCodeKey}`);
          if (err.code) details.push(`code:${err.code}`);
          const label = granted && granted.length > 0 ? "warn" : "error";
          details.push(`${label}:${err.message || "Subscribe error"}`);
        }

        if (packet && "reasonCodes" in packet) {
          const reasons = (packet as { reasonCodes?: number[] }).reasonCodes;
          if (reasons && reasons.length > 0) details.push(`suback:${reasons.join(",")}`);
        }

        this.handlers.onSubscription(filter, details.join(" | ") || "subscribed");
      });
    });

    client.on("message", (topic, payload) => {
      this.handlers.onMessage(topic, payload.toString());
    });

    client.on("reconnect", () => {
      this.handlers.onStatus("connecting");
    });

    client.on("close", () => {
      this.handlers.onStatus("disconnected");
    });

    client.on("error", (error) => {
      const code = (error as { code?: string }).code;
      const detail = code ? `${error.message} (${code})` : error.message;
      this.handlers.onStatus("error", detail || "Unknown error");
    });

    client.on("offline", () => {
      this.handlers.onStatus("disconnected");
    });
  }

  disconnect() {
    if (!this.client) return;
    this.client.end(true);
    this.client = null;
    this.handlers.onStatus("disconnected");
  }

  updateConfig(config: BrokerConfig) {
    this.config = config;
    this.disconnect();
    this.connect();
  }

  publish(topic: string, payload: string) {
    if (!this.client) return;
    this.client.publish(topic, payload, { qos: this.config.qos });
  }
}
