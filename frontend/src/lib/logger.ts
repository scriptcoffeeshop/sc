export type LogLevel = "info" | "warn" | "error";

type LogDetails = unknown;

interface LogDetailsObject {
  [key: string]: unknown;
}

export interface AppLogger {
  info: (message: string, details?: LogDetails) => void;
  warn: (message: string, details?: LogDetails) => void;
  error: (message: string, details?: LogDetails) => void;
}

function normalizeDetails(
  details: LogDetails,
  seen = new WeakSet<object>(),
): unknown {
  if (details instanceof Error) {
    return {
      name: details.name,
      message: details.message,
      stack: details.stack,
    };
  }
  if (!details || typeof details !== "object") return details;
  if (seen.has(details)) return "[Circular]";
  seen.add(details);
  if (Array.isArray(details)) {
    return details.map((item) => normalizeDetails(item, seen));
  }
  return Object.fromEntries(
    Object.entries(details as LogDetailsObject).map(([key, value]) => [
      key,
      normalizeDetails(value, seen),
    ]),
  );
}

function writeLog(
  level: LogLevel,
  scope: string,
  message: string,
  details?: LogDetails,
) {
  const entry = {
    level,
    scope,
    message,
    details: details === undefined ? undefined : normalizeDetails(details),
    timestamp: new Date().toISOString(),
  };
  const prefix = `[${scope}] ${message}`;
  console[level](prefix, entry);
}

export function createLogger(scope: string): AppLogger {
  return {
    info: (message, details) => writeLog("info", scope, message, details),
    warn: (message, details) => writeLog("warn", scope, message, details),
    error: (message, details) => writeLog("error", scope, message, details),
  };
}
