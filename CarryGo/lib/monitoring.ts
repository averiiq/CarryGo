import { Platform } from 'react-native';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type LogContext = Record<string, unknown>;

interface MonitoringConfig {
  enabled: boolean;
  dsn?: string;
  environment: string;
  appVersion: string;
}

let config: MonitoringConfig = {
  enabled: __DEV__ ? false : true,
  environment: __DEV__ ? 'development' : 'production',
  appVersion: '1.1.0',
};

const LOG_BUFFER: Array<{ level: LogLevel; message: string; context?: LogContext; timestamp: number }> = [];
const MAX_BUFFER = 100;

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

function pushToBuffer(entry: { level: LogLevel; message: string; context?: LogContext; timestamp: number }) {
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_BUFFER) {
    LOG_BUFFER.shift();
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
