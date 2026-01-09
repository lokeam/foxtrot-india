import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { env } from './env';
import { prisma } from './prisma';

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
  })
);

const port = parseInt(env.PORT, 10);

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(port, () => {
      console.log(`✅ Server running on http://localhost:${port}`);
      console.log(`📡 tRPC endpoint: http://localhost:${port}/trpc`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
