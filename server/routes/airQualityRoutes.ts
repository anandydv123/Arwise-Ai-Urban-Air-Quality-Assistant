import { Router } from 'express';
import {
  fetchAirQualityAndWeather,
  UpstreamApiError,
} from '../services/openMeteoService.ts';
import { coordinatesSchema } from '../utils/validation.ts';

export const airQualityRouter = Router();

airQualityRouter.get('/', async (req, res, next) => {
  const parsed = coordinatesSchema.safeParse({
    lat: req.query.lat,
    lon: req.query.lon,
  });

  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid latitude or longitude.',
      code: 'INVALID_COORDINATES',
    });
    return;
  }

  try {
    const dataset = await fetchAirQualityAndWeather(parsed.data.lat, parsed.data.lon);
    res.json(dataset);
  } catch (error) {
    if (error instanceof UpstreamApiError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: 'UPSTREAM_UNAVAILABLE',
      });
      return;
    }
    next(error);
  }
});
