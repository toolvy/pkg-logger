export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal"
  | "silent";

export interface LoggerOptions {
  level?: LogLevel;
  name?: string;
  timestamp?: boolean;
  colors?: boolean;
}

const LEVEL = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: Infinity,
} as const;

const LABEL = {
  trace: "TRC",
  debug: "DBG",
  info: "INF",
  warn: "WRN",
  error: "ERR",
  fatal: "FTL",
} as const;

const COLOR = {
  trace: "\x1b[90m",
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  fatal: "\x1b[91m",
} as const;

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

type WritableLevel = Exclude<LogLevel, "silent">;

function format(value: unknown): string {
  if (typeof value === "string") return value;

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return String(value);
  }

  if (typeof value === "bigint") {
    return `${value}n`;
  }

  if (value === null) return "null";

  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export class Logger {
  private level: number;
  private readonly name?: string;
  private readonly timestamp: boolean;
  private readonly colors: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = LEVEL[options.level ?? "info"];
    this.name = options.name;
    this.timestamp = options.timestamp ?? true;

    this.colors =
      options.colors ??
      (process.stdout.isTTY &&
        process.env.NO_COLOR === undefined);
  }

  setLevel(level: LogLevel): this {
    this.level = LEVEL[level];
    return this;
  }

  isLevelEnabled(level: WritableLevel): boolean {
    return LEVEL[level] >= this.level;
  }

  child(name: string): Logger {
    return new Logger({
      level: this.levelName(),
      name: this.name ? `${this.name}:${name}` : name,
      timestamp: this.timestamp,
      colors: this.colors,
    });
  }

  trace(message?: unknown, ...args: unknown[]): void {
    if (LEVEL.trace < this.level) return;
    this.write("trace", message, args);
  }

  debug(message?: unknown, ...args: unknown[]): void {
    if (LEVEL.debug < this.level) return;
    this.write("debug", message, args);
  }

  info(message?: unknown, ...args: unknown[]): void {
    if (LEVEL.info < this.level) return;
    this.write("info", message, args);
  }

  warn(message?: unknown, ...args: unknown[]): void {
    if (LEVEL.warn < this.level) return;
    this.write("warn", message, args);
  }

  error(message?: unknown, ...args: unknown[]): void {
    if (LEVEL.error < this.level) return;
    this.write("error", message, args);
  }

  fatal(message?: unknown, ...args: unknown[]): void {
    if (LEVEL.fatal < this.level) return;
    this.write("fatal", message, args);
  }

  private write(
    level: WritableLevel,
    message: unknown,
    args: unknown[],
  ): void {
    let line = "";

    if (this.timestamp) {
      const time = new Date().toISOString().slice(11, 23);

      line += this.colors
        ? `${DIM}${time}${RESET} `
        : `${time} `;
    }

    if (this.colors) {
      line += `${COLOR[level]}${LABEL[level]}${RESET}`;
    } else {
      line += LABEL[level];
    }

    if (this.name) {
      line += this.colors
        ? ` ${DIM}[${this.name}]${RESET}`
        : ` [${this.name}]`;
    }

    if (message !== undefined) {
      line += ` ${format(message)}`;
    }

    for (let i = 0; i < args.length; i++) {
      line += ` ${format(args[i])}`;
    }

    line += "\n";

    if (
      level === "warn" ||
      level === "error" ||
      level === "fatal"
    ) {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }
  }

  private levelName(): LogLevel {
    if (this.level <= LEVEL.trace) return "trace";
    if (this.level <= LEVEL.debug) return "debug";
    if (this.level <= LEVEL.info) return "info";
    if (this.level <= LEVEL.warn) return "warn";
    if (this.level <= LEVEL.error) return "error";
    if (this.level <= LEVEL.fatal) return "fatal";

    return "silent";
  }
}

export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}

export const logger = new Logger();