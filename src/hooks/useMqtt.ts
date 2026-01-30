import { useEffect, useRef, type Dispatch } from "react";
import { MqttManager } from "../mqtt";
import type { BrokerConfig } from "../state";
import type { Action } from "../app/reducer";

export const useMqtt = (broker: BrokerConfig, dispatch: Dispatch<Action>) => {
  const mqttRef = useRef<MqttManager | null>(null);

  useEffect(() => {
    if (!mqttRef.current) {
      mqttRef.current = new MqttManager(broker, {
        onStatus: (status, error) => dispatch({ type: "status", status, error }),
        onSubscription: (filter, info) => dispatch({ type: "subscription", filter, info }),
        onMessage: (topic, payload) => dispatch({ type: "message", topic, payload }),
      });
      mqttRef.current.connect();
      return;
    }
    mqttRef.current.updateConfig(broker);
  }, [broker, dispatch]);

  const publish = (topic: string, payload: string) => {
    mqttRef.current?.publish(topic, payload);
  };

  return { publish };
};
