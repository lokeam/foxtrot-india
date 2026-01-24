import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: Type assertions (as any) are necessary when mocking fetch responses
// because the mock types don't perfectly match the Fetch API types

// Mock fetch globally
global.fetch = vi.fn();

describe('POST /upload', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a minimal Express app with just the upload endpoint
    app = express();
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // Copy the upload endpoint from index.ts
    app.post('/upload', async (req, res) => {
      try {
        const { filename, base64, bucket = 'inspection-photos' } = req.body;

        if (!filename || !base64) {
          return res.status(400).json({ error: 'Missing filename or base64 data' });
        }

        if (filename.includes('..')) {
          return res.status(400).json({ error: 'Invalid filename' });
        }

        const buffer = Buffer.from(base64, 'base64');

        const maxSize = 10 * 1024 * 1024;
        if (buffer.length > maxSize) {
          return res.status(400).json({ error: 'File too large (max 10MB)' });
        }

        const uploadUrl = `${process.env.SUPABASE_URL}/object/${bucket}/${filename}`;

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'image/jpeg',
          },
          body: buffer,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json() as { message?: string };
          return res.status(500).json({
            error: 'Failed to upload to storage',
            details: errorData.message || 'Unknown error'
          });
        }

        const uploadData = await uploadResponse.json() as { Key?: string };

        const publicUrl = `${process.env.SUPABASE_URL}/object/public/${bucket}/${filename}`;

        return res.json({ url: publicUrl, path: uploadData.Key || `${bucket}/${filename}` });
      } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('uploads base64 image to Supabase Storage', async () => {
    // Arrange
    const validBase64 = Buffer.from('fake-image-data').toString('base64');
    const filename = 'test-photo.jpg';

    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ Key: `inspection-photos/${filename}` }),
    });

    // Act
    const response = await request(app)
      .post('/upload')
      .send({
        filename,
        base64: validBase64,
        bucket: 'inspection-photos',
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('url');
    expect(response.body).toHaveProperty('path');
    expect(response.body.url).toContain(filename);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/object/inspection-photos/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer'),
          'Content-Type': 'image/jpeg',
        }),
      })
    );
  });

  test('returns public URL and path', async () => {
    // Arrange
    const validBase64 = Buffer.from('fake-image-data').toString('base64');
    const filename = 'test-photo-123.jpg';

    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ Key: `inspection-photos/${filename}` }),
    });

    // Act
    const response = await request(app)
      .post('/upload')
      .send({
        filename,
        base64: validBase64,
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.url).toBe(
      `${process.env.SUPABASE_URL}/object/public/inspection-photos/${filename}`
    );
    expect(response.body.path).toBe(`inspection-photos/${filename}`);
  });

  test('returns 400 when filename missing', async () => {
    // Arrange
    const validBase64 = Buffer.from('fake-image-data').toString('base64');

    // Act
    const response = await request(app)
      .post('/upload')
      .send({
        base64: validBase64,
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing filename or base64 data');
  });

  test('returns 400 when base64 missing', async () => {
    // Act
    const response = await request(app)
      .post('/upload')
      .send({
        filename: 'test.jpg',
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing filename or base64 data');
  });

  test('returns 400 when filename contains directory traversal', async () => {
    // Arrange
    const validBase64 = Buffer.from('fake-image-data').toString('base64');
    const maliciousFilename = '../../../etc/passwd';

    // Act
    const response = await request(app)
      .post('/upload')
      .send({
        filename: maliciousFilename,
        base64: validBase64,
      });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid filename');
  });

  test('returns 413 when file exceeds 10MB', async () => {
    // Arrange
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    const largeBase64 = largeBuffer.toString('base64');

    // Act
    const response = await request(app)
      .post('/upload')
      .send({
        filename: 'large-file.jpg',
        base64: largeBase64,
      });

    // Assert - Express returns 413 for payloads exceeding the limit
    expect(response.status).toBe(413);
  });

  test('returns 500 when Supabase upload fails', async () => {
    // Arrange
    const validBase64 = Buffer.from('fake-image-data').toString('base64');

    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Storage bucket not found' }),
    });

    // Act
    const response = await request(app)
      .post('/upload')
      .send({
        filename: 'test.jpg',
        base64: validBase64,
      });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to upload to storage');
    expect(response.body.details).toBe('Storage bucket not found');
  });

  test('prevents path traversal attacks (../)', async () => {
    // Arrange
    const validBase64 = Buffer.from('fake-image-data').toString('base64');
    const attackFilenames = [
      '../sensitive-file.jpg',
      '../../etc/passwd',
      'folder/../../../secret.jpg',
    ];

    // Act & Assert
    for (const filename of attackFilenames) {
      const response = await request(app)
        .post('/upload')
        .send({
          filename,
          base64: validBase64,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid filename');
    }
  });

  test('enforces file size limit', async () => {
    // Arrange - Create a small file (should pass)
    const smallBuffer = Buffer.from('small-image-data');
    const smallBase64 = smallBuffer.toString('base64');

    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ Key: 'inspection-photos/small-file.jpg' }),
    });

    // Act
    const response = await request(app)
      .post('/upload')
      .send({
        filename: 'small-file.jpg',
        base64: smallBase64,
      });

    // Assert - Should succeed with small file
    expect(response.status).toBe(200);

    // Now test file exceeding 10MB (should fail with 413)
    const overSizeBuffer = Buffer.alloc(11 * 1024 * 1024);
    const overSizeBase64 = overSizeBuffer.toString('base64');

    const response2 = await request(app)
      .post('/upload')
      .send({
        filename: 'over-size.jpg',
        base64: overSizeBase64,
      });

    // Assert - Express returns 413 for payloads exceeding the limit
    expect(response2.status).toBe(413);
  });
});
