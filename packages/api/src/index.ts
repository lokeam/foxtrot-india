import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { prisma } from './prisma';
import { env } from './env';

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

/**
 * Photo Upload Endpoint
 *
 * Uploads photos to Supabase Storage using the Storage API.
 * Files are stored in the specified bucket and a public URL is returned.
 */
app.post('/upload', async (req, res) => {
  try {
    const { filename, base64, bucket = 'inspection-photos' } = req.body;

    // Validate required fields
    if (!filename || !base64) {
      return res.status(400).json({ error: 'Missing filename or base64 data' });
    }

    // Validate filename (prevent directory traversal)
    if (filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(base64, 'base64');

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }

    // Upload to Supabase Storage using direct HTTP call
    // The storage API expects routes at /object/bucket/file (not /storage/v1/object/bucket/file)
    const uploadUrl = `${env.SUPABASE_URL}/object/${bucket}/${filename}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'image/jpeg',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json() as { message?: string };
      console.error('Supabase upload error:', errorData);
      return res.status(500).json({ error: 'Failed to upload to storage', details: errorData.message || 'Unknown error' });
    }

    const uploadData = await uploadResponse.json() as { Key?: string };

    // Generate public URL
    const publicUrl = `${env.SUPABASE_URL}/object/public/${bucket}/${filename}`;

    console.log(`✅ Photo uploaded to Supabase Storage: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);
    return res.json({ url: publicUrl, path: uploadData.Key || `${bucket}/${filename}` });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/crash-report', async (req, res) => {
  try {
    const { message, componentStack, screenName, platform, appVersion } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, id: null });
    }
    if (!componentStack || typeof componentStack !== 'string') {
      return res.status(400).json({ success: false, id: null });
    }

    const report = await prisma.crashReport.create({
      data: {
        message: message.slice(0, 2000),
        componentStack: componentStack.slice(0, 5000),
        screenName: screenName ? String(screenName).slice(0, 200) : null,
        platform: platform ? String(platform).slice(0, 50) : null,
        appVersion: appVersion ? String(appVersion).slice(0, 50) : null,
      },
    });

    return res.json({ success: true, id: report.id });
  } catch (error) {
    console.error('Crash report error:', error);
    return res.json({ success: false, id: null });
  }
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
