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

// 100 req / 15 min / IP across all API routes; auth gets a tighter limit.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth attempts, please try again in an hour.',
  },
});

app.use('/api', apiLimiter);
app.use('/api', responseWrapper);

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

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/users', userRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
