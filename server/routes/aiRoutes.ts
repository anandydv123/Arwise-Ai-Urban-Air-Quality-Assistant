import { Router } from 'express';
import { createRateLimiter } from '../middleware/security.ts';
import {
  GeminiServiceError,
  generateHealthAssistantAdvice,
} from '../services/geminiService.ts';
import {
  HuggingFaceServiceError,
  generateHuggingFaceHealthAdvice,
  isHuggingFaceConfigured,
} from '../services/huggingFaceService.ts';
import { aiAssistantRequestSchema } from '../utils/validation.ts';

export const aiRouter = Router();

const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: 'Too many AI assistant requests. Please wait a minute or use the rule-based recommendations.',
});

aiRouter.post('/health-assistant', aiRateLimiter, async (req, res, next) => {
  const parsed = aiAssistantRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid AI assistant request payload.',
      code: 'INVALID_AI_REQUEST',
    });
    return;
  }

  const provider = parsed.data.provider;

  if (provider === 'huggingface') {
    try {
      const result = await generateHuggingFaceHealthAdvice(parsed.data);
      res.json({
        advice: result.advice,
        model: result.model,
        source: 'huggingface',
      });
      return;
    } catch (error) {
      if (error instanceof HuggingFaceServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
        return;
      }
      next(error);
      return;
    }
  }

  try {
    const result = await generateHealthAssistantAdvice(parsed.data);
    res.json({
      advice: result.advice,
      model: result.model,
      source: 'gemini',
    });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      if (error.code === 'PROMPT_REJECTED') {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
        return;
      }

      // In 'auto' mode, automatically fail over to Hugging Face if configured
      if (provider === 'auto' && isHuggingFaceConfigured()) {
        try {
          const hfResult = await generateHuggingFaceHealthAdvice(parsed.data);
          res.json({
            advice: hfResult.advice,
            model: hfResult.model,
            source: 'huggingface',
          });
          return;
        } catch (hfError) {
          if (hfError instanceof HuggingFaceServiceError) {
            res.status(hfError.statusCode).json({
              error: `${error.message} (Hugging Face fallback: ${hfError.message})`,
              code: hfError.code,
            });
            return;
          }
        }
      }

      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    next(error);
  }
});
