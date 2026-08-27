import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type LogContext = Record<string, unknown>;

interface MonitoringConfig {
  enabled: boolean;
  dsn?: string;
  environment: string;
  appVersion: string;
}

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

let config: MonitoringConfig = {
  enabled: __DEV__ ? false : true,
  environment: __DEV__ ? 'development' : 'production',
  appVersion: APP_VERSION,
};

const LOG_BUFFER: Array<{ level: LogLevel; message: string; context?: LogContext; timestamp: number }> = [];
const MAX_BUFFER = 100;

const PII_FIELDS = new Set(['password', 'token', 'secret', 'otp', 'authorization']);

export function initMonitoring(overrides?: Partial<MonitoringConfig>) {
  config = { ...config, ...overrides };
}

export function captureException(error: unknown, context?: LogContext) {
  const entry = {
    level: 'error' as LogLevel,
    message: error instanceof Error ? error.message : String(error),
    context: {
      ...context,
      stack: error instanceof Error ? error.stack : undefined,
      platform: Platform.OS,
      appVersion: config.appVersion,
    },
    timestamp: Date.now(),
  };

  pushToBuffer(entry);

  if (__DEV__) {
    console.error('[Monitor]', entry.message, entry.context);
  }
}

export function captureMessage(message: string, level: LogLevel = 'info', context?: LogContext) {
  const entry = {
    level,
    message,
    context: { ...context, platform: Platform.OS },
    timestamp: Date.now(),
  };

  pushToBuffer(entry);

  if (__DEV__) {
    const logFn = level === 'error' || level === 'fatal' ? console.error
      : level === 'warn' ? console.warn
      : console.log;
    logFn(`[Monitor:${level}]`, message, context);
  }
}

export function setUser(userId: string, extra?: LogContext) {
  captureMessage('user_identified', 'debug', { userId, ...extra });
}

export function trackPerformance(name: string, durationMs: number, context?: LogContext) {
  const entry = {
    level: 'info' as LogLevel,
    message: `perf:${name}`,
    context: { ...context, durationMs, platform: Platform.OS },
    timestamp: Date.now(),
  };

  pushToBuffer(entry);

  if (__DEV__ && durationMs > 1000) {
    console.warn(`[Perf] ${name} took ${durationMs}ms`, context);
  }
}

export function trackApiCall(endpoint: string, method: string, durationMs: number, status: number) {
  trackPerformance(`api:${method}:${endpoint}`, durationMs, { status });
}

export function getLogBuffer() {
  return [...LOG_BUFFER];
}

export function flushLogBuffer() {
  const entries = [...LOG_BUFFER];
  LOG_BUFFER.length = 0;
  return entries;
}

export async function shipLogs(): Promise<void> {
  if (!config.enabled || LOG_BUFFER.length === 0) return;

  const endpoint = config.dsn;
  if (!endpoint) return;

  const entries = flushLogBuffer();

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries,
        environment: config.environment,
        appVersion: config.appVersion,
      }),
    });
  } catch {
    LOG_BUFFER.unshift(...entries.slice(-MAX_BUFFER));
  }
}

/**
 * Strips PII fields (password, token, secret, otp, authorization) from a context object.
 */
function scrubPii(context: LogContext | undefined): LogContext | undefined {
  if (!context) return context;
  const scrubbed: LogContext = {};
  for (const key of Object.keys(context)) {
    if (PII_FIELDS.has(key.toLowerCase())) {
      scrubbed[key] = '[REDACTED]';
    } else {
      scrubbed[key] = context[key];
    }
  }
  return scrubbed;
}

/**
 * Flushes buffered logs. In dev mode, prints to console. In production,
 * delegates to shipLogs if a DSN is configured.
 */
export function flushLogs(): void {
  if (LOG_BUFFER.length === 0) return;

  if (__DEV__) {
    const entries = [...LOG_BUFFER];
    LOG_BUFFER.length = 0;
    for (const entry of entries) {
      const logFn = entry.level === 'error' || entry.level === 'fatal'
        ? console.error
        : entry.level === 'warn'
        ? console.warn
        : console.log;
      logFn(`[Flush:${entry.level}]`, entry.message, entry.context);
    }
  } else {
    void shipLogs();
  }
}

function pushToBuffer(entry: { level: LogLevel; message: string; context?: LogContext; timestamp: number }) {
  const scrubbedEntry = { ...entry, context: scrubPii(entry.context) };
  LOG_BUFFER.push(scrubbedEntry);
  if (LOG_BUFFER.length > MAX_BUFFER) {
    LOG_BUFFER.shift();
  }
  if (LOG_BUFFER.length >= MAX_BUFFER) {
    flushLogs();
  }
}

export function measureAsync<T>(name: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
  const start = Date.now();
  return fn().then(
    (result) => {
      trackPerformance(name, Date.now() - start, context);
      return result;
    },
    (error) => {
      trackPerformance(name, Date.now() - start, { ...context, failed: true });
      throw error;
    }
  );
}
