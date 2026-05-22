import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isDevelopment } from './config/env';
import { AppError } from './utils/AppError';
import authRouter from './routes/auth';

// App factory only — server.ts calls listen(), so this stays testable.
const app: Application = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

if (isDevelopment) {
  app.use(morgan('dev'));
}

// 10mb leaves room for multipart metadata; multer handles the file streams.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'mpms-backend',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error handler must keep all four args and stay last.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // AppError carries an intended status code; anything else is an unexpected 500.
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Duplicate-key errors from Mongo (e.g. registering an existing email).
  if (err.name === 'MongoServerError' && (err as { code?: number }).code === 11000) {
    res.status(409).json({ message: 'A record with these details already exists.' });
    return;
  }

  console.error('[error]', err.stack ?? err.message);
  res.status(500).json({
    message: 'Internal server error',
    ...(isDevelopment ? { error: err.message } : {}),
  });
});

export default app;
