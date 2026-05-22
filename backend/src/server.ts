import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './utils/logger';

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception — shutting down', error.stack ?? error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection — shutting down', reason);
  process.exit(1);
});

async function start(): Promise<void> {
  // Connect to the DB before opening the port — a server without a DB is useless.
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`mpms-backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal} — shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force-exit if draining hangs.
    setTimeout(() => {
      logger.error('Forced shutdown — drain timed out');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Failed to start server: ${message}`);
  process.exit(1);
});
