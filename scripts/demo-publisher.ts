import mqtt from "mqtt";

type NumericTopic = {
  topic: string;
  value: number;
};

type BooleanTopic = {
  topic: string;
  value: boolean;
};

type ObjectTopic = {
  topic: string;
  build: () => Record<string, unknown>;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseArgs = () => {
  const args = process.argv.slice(2);
  const getValue = (flag: string, fallback: string) => {
    const index = args.indexOf(flag);
    if (index >= 0 && args[index + 1]) return args[index + 1] as string;
    return fallback;
  };
  const hasFlag = (flag: string) => args.includes(flag);

  return {
    host: getValue("--host", "localhost"),
    port: Number(getValue("--port", "1883")),
    username: getValue("--user", ""),
    password: getValue("--password", ""),
    tls: hasFlag("--tls"),
  };
};

const { host, port, username, password, tls } = parseArgs();
const protocol = tls ? "mqtts" : "mqtt";
const url = `${protocol}://${host}:${port}`;

const client = mqtt.connect(url, {
  username: username || undefined,
  password: password || undefined,
  reconnectPeriod: 1000,
  keepalive: 30,
});

const numericTopics: NumericTopic[] = [
  { topic: "demo/motor/temperature", value: 25 },
  { topic: "demo/motor/rpm", value: 10 },
  { topic: "demo/motor/load", value: 15 },
  { topic: "demo/pump/pressure", value: 30 },
  { topic: "demo/pump/flow", value: 12 },
  { topic: "demo/pump/vibration", value: 3 },
  { topic: "demo/lights/brightness", value: 50 },
  { topic: "demo/ambient/temp", value: 21 },
  { topic: "demo/ambient/humidity", value: 45 },
  { topic: "demo/ambient/co2", value: 400 },
  { topic: "demo/valve/position", value: 0 },
  { topic: "demo/tank/level", value: 70 },
  { topic: "demo/tank/temperature", value: 18 },
  { topic: "demo/grid/voltage", value: 230 },
  { topic: "demo/grid/current", value: 5 },
];

const booleanTopics: BooleanTopic[] = [
  { topic: "demo/motor/state", value: false },
  { topic: "demo/pump/enabled", value: true },
  { topic: "demo/lights/zone1", value: true },
  { topic: "demo/lights/zone2", value: false },
  { topic: "demo/lights/zone3", value: true },
  { topic: "demo/door/locked", value: true },
  { topic: "demo/valve/open", value: false },
  { topic: "demo/alarm/active", value: false },
];

const objectTopics: ObjectTopic[] = [
  {
    topic: "demo/system/status",
    build: () => ({
      uptimeSec: Math.floor(Date.now() / 1000) % 100000,
      version: "0.1.0",
      connected: true,
      mode: "auto",
      errors: {
        active: false,
        lastCode: null,
        lastAt: null,
      },
    }),
  },
  {
    topic: "demo/motor/metrics",
    build: () => ({
      temperature: numericTopics.find((t) => t.topic === "demo/motor/temperature")?.value ?? 0,
      rpm: numericTopics.find((t) => t.topic === "demo/motor/rpm")?.value ?? 0,
      load: numericTopics.find((t) => t.topic === "demo/motor/load")?.value ?? 0,
      state: booleanLookup.get("demo/motor/state")?.value ?? false,
      bearings: {
        left: {
          temp: numericTopics.find((t) => t.topic === "demo/motor/temperature")?.value ?? 0,
          vibration: numericTopics.find((t) => t.topic === "demo/pump/vibration")?.value ?? 0,
        },
        right: {
          temp: (numericTopics.find((t) => t.topic === "demo/motor/temperature")?.value ?? 0) - 1,
          vibration: (numericTopics.find((t) => t.topic === "demo/pump/vibration")?.value ?? 0) + 0.2,
        },
      },
    }),
  },
  {
    topic: "demo/pump/metrics",
    build: () => ({
      pressure: numericTopics.find((t) => t.topic === "demo/pump/pressure")?.value ?? 0,
      flow: numericTopics.find((t) => t.topic === "demo/pump/flow")?.value ?? 0,
      vibration: numericTopics.find((t) => t.topic === "demo/pump/vibration")?.value ?? 0,
      enabled: booleanLookup.get("demo/pump/enabled")?.value ?? false,
      seals: {
        inlet: {
          wear: Math.abs((numericTopics.find((t) => t.topic === "demo/pump/vibration")?.value ?? 0) / 10),
          temp: (numericTopics.find((t) => t.topic === "demo/pump/pressure")?.value ?? 0) + 5,
        },
        outlet: {
          wear: Math.abs((numericTopics.find((t) => t.topic === "demo/pump/vibration")?.value ?? 0) / 12),
          temp: (numericTopics.find((t) => t.topic === "demo/pump/pressure")?.value ?? 0) + 3,
        },
      },
    }),
  },
  {
    topic: "demo/ambient/metrics",
    build: () => ({
      temp: numericTopics.find((t) => t.topic === "demo/ambient/temp")?.value ?? 0,
      humidity: numericTopics.find((t) => t.topic === "demo/ambient/humidity")?.value ?? 0,
      co2: numericTopics.find((t) => t.topic === "demo/ambient/co2")?.value ?? 0,
      zones: {
        north: {
          temp: (numericTopics.find((t) => t.topic === "demo/ambient/temp")?.value ?? 0) - 1,
          humidity: (numericTopics.find((t) => t.topic === "demo/ambient/humidity")?.value ?? 0) + 2,
        },
        south: {
          temp: (numericTopics.find((t) => t.topic === "demo/ambient/temp")?.value ?? 0) + 1,
          humidity: (numericTopics.find((t) => t.topic === "demo/ambient/humidity")?.value ?? 0) - 2,
        },
      },
    }),
  },
  {
    topic: "demo/lights/status",
    build: () => ({
      zone1: booleanLookup.get("demo/lights/zone1")?.value ?? false,
      zone2: booleanLookup.get("demo/lights/zone2")?.value ?? false,
      zone3: booleanLookup.get("demo/lights/zone3")?.value ?? false,
      brightness: numericTopics.find((t) => t.topic === "demo/lights/brightness")?.value ?? 0,
      scene: {
        name: "evening",
        targets: {
          zone1: 60,
          zone2: 30,
          zone3: 10,
        },
      },
    }),
  },
  {
    topic: "demo/grid/status",
    build: () => ({
      voltage: numericTopics.find((t) => t.topic === "demo/grid/voltage")?.value ?? 0,
      current: numericTopics.find((t) => t.topic === "demo/grid/current")?.value ?? 0,
      power: (numericTopics.find((t) => t.topic === "demo/grid/voltage")?.value ?? 0) *
        (numericTopics.find((t) => t.topic === "demo/grid/current")?.value ?? 0),
      phases: {
        a: {
          voltage: (numericTopics.find((t) => t.topic === "demo/grid/voltage")?.value ?? 0) - 2,
          current: (numericTopics.find((t) => t.topic === "demo/grid/current")?.value ?? 0) + 0.5,
        },
        b: {
          voltage: (numericTopics.find((t) => t.topic === "demo/grid/voltage")?.value ?? 0) + 1,
          current: (numericTopics.find((t) => t.topic === "demo/grid/current")?.value ?? 0) - 0.2,
        },
        c: {
          voltage: (numericTopics.find((t) => t.topic === "demo/grid/voltage")?.value ?? 0) + 0.5,
          current: (numericTopics.find((t) => t.topic === "demo/grid/current")?.value ?? 0) + 0.1,
        },
      },
    }),
  },
];

const booleanLookup = new Map(booleanTopics.map((entry) => [entry.topic, entry]));

const updateNumericValues = () => {
  for (const entry of numericTopics) {
    const delta = Math.round((Math.random() * 10 - 5) * 10) / 10;
    entry.value = clamp(entry.value + delta, -100, 100);
  }
};

const publishAll = () => {
  updateNumericValues();
  for (const entry of numericTopics) {
    client.publish(entry.topic, entry.value.toFixed(1));
  }
  for (const entry of booleanTopics) {
    client.publish(entry.topic, entry.value ? "true" : "false");
  }
  for (const entry of objectTopics) {
    client.publish(entry.topic, JSON.stringify(entry.build()));
  }
};

const handleBooleanUpdate = (topic: string, payload: string) => {
  const entry = booleanLookup.get(topic);
  if (!entry) return;
  const normalized = payload.trim().toLowerCase();
  if (normalized === "true") entry.value = true;
  if (normalized === "false") entry.value = false;
};

client.on("connect", () => {
  console.log(`Demo publisher connected to ${url}`);
  client.subscribe(booleanTopics.map((entry) => entry.topic));
  publishAll();
  const timer = setInterval(publishAll, 2000);
  const stop = () => {
    clearInterval(timer);
    client.end(true, () => process.exit(0));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
});

client.on("message", (topic, payload) => {
  handleBooleanUpdate(topic, payload.toString());
});

client.on("error", (error) => {
  console.error("MQTT error:", error.message);
});
