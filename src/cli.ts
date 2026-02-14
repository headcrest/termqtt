export type CliOverrides = {
  broker?: string;
  port?: number;
  user?: string;
  password?: string;
  tls?: boolean;
  rootTopic?: string;
  /** Additional topic subscriptions (beyond the primary rootTopic). */
  extraTopics?: string[];
};

export type ClearStorageOptions = {
  enabled: boolean;
  pattern?: string;
};

export type CliParseResult = {
  overrides: CliOverrides;
  showHelp: boolean;
  showVersion: boolean;
  clearStorage: ClearStorageOptions;
  upgrade: boolean;
  yes: boolean;
};

export const parseArgs = (args: string[]): CliParseResult => {
  const overrides: CliOverrides = {};
  let showHelp = false;
  let showVersion = false;
  let upgrade = false;
  let yes = false;
  const clearStorage: ClearStorageOptions = { enabled: false };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === "--help" || arg === "-h") {
      showHelp = true;
      continue;
    }
    if (arg === "--version" || arg === "-v") {
      showVersion = true;
      continue;
    }
    if (arg === "--upgrade") {
      upgrade = true;
      continue;
    }
    if (arg === "--yes" || arg === "-y") {
      yes = true;
      continue;
    }
    if (arg === "--tls" || arg === "-t") {
      overrides.tls = true;
      continue;
    }

    if (arg === "--clear-storage") {
      clearStorage.enabled = true;
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        clearStorage.pattern = next;
        i += 1;
      }
      continue;
    }
    if (arg.startsWith("--clear-storage=")) {
      clearStorage.enabled = true;
      clearStorage.pattern = arg.split("=").slice(1).join("=") || undefined;
      continue;
    }

    const next = args[i + 1];
    if (arg === "--broker" || arg === "-b") {
      if (next) overrides.broker = next;
      i += 1;
      continue;
    }
    if (arg === "--port" || arg === "-P") {
      if (next) overrides.port = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--user" || arg === "-u") {
      if (next) overrides.user = next;
      i += 1;
      continue;
    }
    if (arg === "--password" || arg === "-w") {
      if (next) overrides.password = next;
      i += 1;
      continue;
    }
    if (arg === "--root-topic" || arg === "-r") {
      if (next) {
        if (!overrides.rootTopic) {
          overrides.rootTopic = next;
        } else {
          overrides.extraTopics = [...(overrides.extraTopics ?? []), next];
        }
      }
      i += 1;
      continue;
    }
  }

  return { overrides, showHelp, showVersion, clearStorage, upgrade, yes };
};

export const formatHelp = (version: string) => `termqtt v${version}

Usage:
  termqtt [options]

Options:
  -h, --help               Show help
  -v, --version            Show version
  --upgrade                Upgrade to latest release
  -y, --yes                Skip confirmation prompts
  --clear-storage [glob]   Delete local config files (optional glob)
  -b, --broker <host>      Broker host
  -P, --port <port>        Broker port
  -u, --user <user>        Username
  -w, --password <pass>    Password
  -t, --tls                Enable TLS
  -r, --root-topic <topic> Root topic (subscribe filter); repeat for multiple

Examples:
  termqtt -b localhost -P 1883 -r sensors/#
  termqtt -b localhost -r sensors/# -r devices/# -r alerts/#
  termqtt --broker mqtt.example.com --tls --user alice --password secret -r devices/#
`;

export const matchesPattern = (name: string, pattern: string) => {
  const escaped = pattern.replace(/([.+^=!:${}()|[\]\\])/g, "\\$1");
  const regex = new RegExp(`^${escaped.replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
  return regex.test(name);
};
