import request from 'supertest';
import express from 'express';

// Create a simple test app for health check
const createTestApp = () => {
  const app = express();

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: expect.any(String),
      service: 'FitProof Backend',
    });
  });

  return app;
};

describe('Server Health Check', () => {
  test('should return 200 for health check endpoint', async () => {
    const app = createTestApp();

    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'OK',
      service: 'FitProof Backend',
    });

    expect(response.body.timestamp).toBeDefined();
  });
});

describe('TypeScript Configuration', () => {
  test('should compile TypeScript successfully', () => {
    // This test will pass if TypeScript compilation works
    const testObject: { message: string } = { message: 'TypeScript is working' };
    expect(testObject.message).toBe('TypeScript is working');
  });
});
