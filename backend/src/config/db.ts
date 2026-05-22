import mongoose from 'mongoose';
import { env, isProduction } from './env';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5_000;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Retries cover the initial connect only; mongoose handles reconnects itself.
export async function connectDB(): Promise<void> {
  mongoose.set('autoIndex', !isProduction);
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10_000,
      });
      console.log(`[db] Connected to MongoDB (attempt ${attempt}/${MAX_RETRIES})`);
      registerConnectionListeners();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[db] Connection attempt ${attempt}/${MAX_RETRIES} failed: ${message}`);

      if (attempt === MAX_RETRIES) {
        throw new Error(`[db] Could not connect to MongoDB after ${MAX_RETRIES} attempts`);
      }
      console.log(`[db] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await delay(RETRY_DELAY_MS);
    }
  }
}

function registerConnectionListeners(): void {
  const connection = mongoose.connection;

  connection.on('error', (err) => {
    console.error('[db] Connection error after initial connect:', err.message);
  });
  connection.on('disconnected', () => {
    console.warn('[db] Disconnected from MongoDB');
  });
  connection.on('reconnected', () => {
    console.log('[db] Reconnected to MongoDB');
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.connection.close();
  console.log('[db] MongoDB connection closed');
}
