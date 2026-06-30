import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

dotenv.config();

export const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez plus tard' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion, réessayez plus tard' },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez plus tard' },
});

import authRoutes from './modules/auth/routes';
import hotspotRoutes from './modules/hotspots/routes';
import hotspotMikrotikRoutes from './modules/hotspots/mikrotik-routes';
import planRoutes from './modules/plans/routes';
import voucherRoutes from './modules/vouchers/routes';
import transactionRoutes from './modules/transactions/routes';
import paymentRoutes from './modules/payments/routes';
import digHiConnectRoutes from './modules/dighiconnect/routes';
import captivePortalRoutes from './modules/payments/captive-portal';
import resellerRoutes from './modules/resellers/routes';
import partnerRoutes from './modules/partners/routes';
import roamingRoutes from './modules/roaming/routes';
import notificationRoutes from './modules/notifications/routes';
import userRoutes from './modules/users/routes';
import docRoutes from './modules/docs/routes';
import exportRoutes from './modules/exports/routes';

app.use('/api', limiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/hotspots', hotspotRoutes);
app.use('/api/hotspots', hotspotMikrotikRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/vouchers', strictLimiter, voucherRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dighiconnect', digHiConnectRoutes);
app.use('/portal', captivePortalRoutes);
app.use('/api/resellers', resellerRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/roaming', roamingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/exports', exportRoutes);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
  });
});

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test' && !process.env.NETLIFY) {
  httpServer.listen(PORT, () => {
    console.log(`MikConnect API running on port ${PORT}`);
  });
}

export { app, io, httpServer };
