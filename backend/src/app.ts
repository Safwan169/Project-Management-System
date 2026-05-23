import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { MulterError } from 'multer';
import { env, isDevelopment } from './config/env';
import { AppError } from './utils/AppError';
import authRouter from './routes/auth';
import projectRouter from './routes/projects';
import taskRouter from './routes/tasks';
import userRouter from './routes/users';
import dashboardRouter from './routes/dashboard';
import reportRouter from './routes/reports';

const app: Application = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

if (isDevelopment) {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'pms-backend',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Serve uploaded files.
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/users', userRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err.name === 'MongoServerError' && (err as { code?: number }).code === 11000) {
    res.status(409).json({ message: 'A record with these details already exists.' });
    return;
  }

  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large.' : `Upload error: ${err.message}`;
    res.status(400).json({ message });
    return;
  }
  if (err.message.startsWith('Unsupported file type')) {
    res.status(400).json({ message: err.message });
    return;
  }

  console.error('[error]', err.stack ?? err.message);
  res.status(500).json({
    message: 'Internal server error',
    ...(isDevelopment ? { error: err.message } : {}),
  });
});

export default app;
