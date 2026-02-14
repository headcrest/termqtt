import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import os from "node:os";
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

const buildClientId = (config: BrokerConfig) => {
  const base = config.clientId?.trim() || "termqtt";
  const host = os.hostname();
  const pid = process.pid;
  return `${base}-${host}-${pid}`;
};

const buildOptions = (config: BrokerConfig): IClientOptions => ({
  clientId: buildClientId(config),
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

  /** Returns the deduplicated list of topic filters to subscribe to. */
  private getActiveFilters(): string[] {
    const primary = this.config.topicFilter?.trim() || "#";
    const extras = (this.config.topicFilters ?? [])
      .map((f) => f.trim())
      .filter((f) => f.length > 0 && f !== primary);
    return [primary, ...extras];
  }

  connect() {
    this.handlers.onStatus("connecting");
    const url = buildUrl(this.config);
    const options = buildOptions(this.config);
    const client = mqtt.connect(url, options);
    this.client = client;

    client.on("connect", () => {
      this.handlers.onStatus("connected");
      const filters = this.getActiveFilters();
      const allGranted: Array<{ topic: string; qos: number }> = [];
      const allDetails: string[] = [];
      let remaining = filters.length;

      const onSubscribed = (
        filter: string,
        error: Error | null,
        granted: Array<{ topic: string; qos: number }> | undefined,
        packet: unknown,
      ) => {
        const err = error as { message?: string; reasonCode?: number; reasonCodeKey?: string; code?: string } | null;

        if (granted && granted.length > 0) {
          allGranted.push(...granted);
          const rejected = granted.filter((item) => item.qos === 128);
          if (rejected.length > 0) allDetails.push(`rejected:${filter}`);
        } else if (!error) {
          allDetails.push(`none:${filter}`);
        }

        if (err) {
          if (err.reasonCode !== undefined) allDetails.push(`rc:${err.reasonCode}`);
          if (err.reasonCodeKey) allDetails.push(`reason:${err.reasonCodeKey}`);
          if (err.code) allDetails.push(`code:${err.code}`);
          const label = granted && granted.length > 0 ? "warn" : "error";
          allDetails.push(`${label}:${err.message || "Subscribe error"}`);
        }

        if (packet && typeof packet === "object" && "reasonCodes" in packet) {
          const reasons = (packet as { reasonCodes?: number[] }).reasonCodes;
          if (reasons && reasons.length > 0) allDetails.push(`suback:${reasons.join(",")}`);
        }

        remaining -= 1;
        if (remaining === 0) {
          const filterLabel = filters.join(", ");
          const grantedSummary =
            allGranted.length > 0
              ? `granted:${allGranted.map((g) => `${g.topic}:${g.qos}`).join(", ")}`
              : "granted:none";
          const infoPrefix = filters.length > 1 ? `subscribed ${filters.length} filters` : "";
          const parts = [infoPrefix, grantedSummary, ...allDetails].filter(Boolean);
          this.handlers.onSubscription(filterLabel, parts.join(" | ") || "subscribed");
        }
      };

      for (const filter of filters) {
        client.subscribe(filter, { qos: this.config.qos }, (error, granted, packet) => {
          onSubscribed(filter, error, granted, packet);
        });
      }
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
