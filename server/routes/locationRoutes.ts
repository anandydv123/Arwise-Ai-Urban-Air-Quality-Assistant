import { Router } from 'express';
import {
  reverseLookupLocation,
  searchLocations,
  UpstreamApiError,
} from '../services/openMeteoService.ts';
import { citySearchSchema, coordinatesSchema } from '../utils/validation.ts';

export const locationRouter = Router();

locationRouter.get('/search', async (req, res, next) => {
  const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
  const parsed = citySearchSchema.safeParse({ q: rawQuery });

  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid search query.',
      code: 'INVALID_SEARCH_QUERY',
    });
    return;
  }

  try {
    const results = await searchLocations(parsed.data.q);
    res.json({ results });
  } catch (error) {
    if (error instanceof UpstreamApiError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: 'GEOCODING_UNAVAILABLE',
      });
      return;
    }
    next(error);
  }
});

locationRouter.get('/reverse', async (req, res) => {
  const parsed = coordinatesSchema.safeParse({
    lat: req.query.lat,
    lon: req.query.lon,
  });

  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid coordinates.',
      code: 'INVALID_COORDINATES',
    });
    return;
  }

  const info = await reverseLookupLocation(parsed.data.lat, parsed.data.lon);
  res.json(info);
});
