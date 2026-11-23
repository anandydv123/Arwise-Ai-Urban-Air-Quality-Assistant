import type { NextFunction, Request, Response } from 'express';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
}) {
  const buckets = new Map<string, RateLimitBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip) || 'unknown';
    const now = Date.now();
    const existing = buckets.get(clientIp);

    if (!existing || now > existing.resetAt) {
      // Prevent unbounded map growth
      if (buckets.size > 5000) {
        buckets.clear();
      }
      buckets.set(clientIp, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (existing.count >= options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: options.message,
        code: 'RATE_LIMITED',
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    existing.count += 1;
    next();
  };
}

export function safeErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) {
    return;
  }

  const isPayloadTooLarge =
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.too.large';

  if (isPayloadTooLarge) {
    res.status(413).json({
      error: 'Request payload exceeds the 64 KB size limit.',
      code: 'PAYLOAD_TOO_LARGE',
    });
    return;
  }

  const isSyntaxError = err instanceof SyntaxError;
  if (isSyntaxError) {
    res.status(400).json({
      error: 'Malformed JSON payload.',
      code: 'INVALID_JSON',
    });
    return;
  }

  res.status(500).json({
    error: 'An unexpected server error occurred.',
    code: 'INTERNAL_ERROR',
  });
}
