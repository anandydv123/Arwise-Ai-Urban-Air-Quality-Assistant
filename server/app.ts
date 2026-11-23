import express from 'express';
import {
  createRateLimiter,
  safeErrorHandler,
  securityHeadersMiddleware,
} from './middleware/security.ts';
import { aiRouter } from './routes/aiRoutes.ts';
import { airQualityRouter } from './routes/airQualityRoutes.ts';
import { locationRouter } from './routes/locationRoutes.ts';
import { resolveGeminiModel } from './services/geminiService.ts';
import { isHuggingFaceConfigured } from './services/huggingFaceService.ts';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '64kb' }));

  const generalApiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 90,
    message: 'Too many API requests from this client. Please retry shortly.',
  });

  app.get('/api/health', (_req, res) => {
    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY.trim() !== '' &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    res.json({
      status: 'ok',
      geminiConfigured,
      huggingFaceConfigured: isHuggingFaceConfigured(),
      configuredModel: resolveGeminiModel(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/air-quality', generalApiLimiter, airQualityRouter);
  app.use('/api/locations', generalApiLimiter, locationRouter);
  app.use('/api/ai', aiRouter);

  // Return JSON 404 for unknown /api routes
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: 'API endpoint not found.',
      code: 'NOT_FOUND',
    });
  });

  app.use(safeErrorHandler);

  return app;
}
