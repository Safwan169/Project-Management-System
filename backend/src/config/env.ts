import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'production' | 'test';

interface Env {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  NODE_ENV: NodeEnv;
  CLIENT_URL: string;
}

function required(key: string): string {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? fallback : value;
}

const rawNodeEnv = optional('NODE_ENV', 'development');
const nodeEnv: NodeEnv =
  rawNodeEnv === 'production' || rawNodeEnv === 'test' ? rawNodeEnv : 'development';

const port = Number(optional('PORT', '5000'));
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`PORT must be a positive integer, received: "${process.env.PORT}"`);
}

export const env: Env = {
  PORT: port,
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  NODE_ENV: nodeEnv,
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:3000'),
};

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
