import { isProduction } from '../config/env';

type Level = 'info' | 'warn' | 'error' | 'debug';

function emit(level: Level, message: string, meta?: unknown): void {
  if (level === 'debug' && isProduction) return;

  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (meta !== undefined) {
    sink(line, meta);
  } else {
    sink(line);
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => emit('info', msg, meta),
  warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta),
  debug: (msg: string, meta?: unknown) => emit('debug', msg, meta),
};
