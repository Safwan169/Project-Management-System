import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, isDevelopment } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { responseWrapper } from './middlewares/responseWrapper';
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

// General API cap (SPA + React Query can burst hundreds of calls while developing).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 10_000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

// Login/register only — count failed attempts so successful logins are not penalized.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 200 : 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait a few minutes and try again.',
  },
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'pms-backend',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', responseWrapper);

// Serve uploaded files.
app.use('/uploads', express.static('uploads'));

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRouter);

app.use('/api/projects', apiLimiter, projectRouter);
app.use('/api/tasks', apiLimiter, taskRouter);
app.use('/api/users', apiLimiter, userRouter);
app.use('/api/dashboard', apiLimiter, dashboardRouter);
app.use('/api/reports', apiLimiter, reportRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
