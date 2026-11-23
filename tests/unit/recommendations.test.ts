import { describe, expect, it } from 'vitest';
import type { AirQualityDataset } from '../../src/types/airQuality.ts';
import {
  buildRuleBasedStructuredAdvice,
  generateRuleBasedRecommendation,
} from '../../src/utils/recommendations.ts';

function makeDataset(usAqi: number | null, pm25: number | null = 20): AirQualityDataset {
  return {
    location: {
      latitude: 12.97,
      longitude: 77.59,
      timezone: 'Asia/Kolkata',
      elevationMeters: 920,
    },
    current: {
      usAqi,
      europeanAqi: usAqi !== null ? Math.round(usAqi / 2) : null,
      pollutants: {
        pm2_5: pm25,
        pm10: 32,
        ozone: 48,
        nitrogenDioxide: 18,
        sulfurDioxide: 6,
        carbonMonoxide: 350,
      },
      weather: {
        temperatureC: 25,
        humidityPercent: 55,
        windSpeedKmh: 12,
        weatherCode: 1,
        weatherLabel: 'Mainly clear',
      },
      observedAt: '2026-11-23T09:00',
    },
    hourlyForecast: [
      {
        time: '2026-11-23T10:00',
        usAqi: usAqi !== null ? Math.max(10, usAqi - 15) : null,
        europeanAqi: 20,
        pm2_5: 15,
        pm10: 25,
        ozone: 40,
        nitrogenDioxide: 15,
      },
    ],
    fetchedAt: '2026-11-23T09:00:00.000Z',
    cached: false,
    attribution: {
      airQuality: 'Open-Meteo Air Quality API',
      weather: 'Open-Meteo Weather API',
      note: 'Model data',
    },
  };
}

describe('Deterministic Recommendation Engine', () => {
  it('returns Unavailable when environmental dataset or AQI is missing', () => {
    const res = generateRuleBasedRecommendation(null, 'general', 'walking');
    expect(res.safetyLevel).toBe('Unavailable');
    expect(res.precautions.length).toBeGreaterThan(0);
  });

  it('escalates caution for sensitive respiratory groups compared to general adults', () => {
    const moderateDataset = makeDataset(82, 24);
    const generalRec = generateRuleBasedRecommendation(moderateDataset, 'general', 'walking');
    const sensitiveRec = generateRuleBasedRecommendation(moderateDataset, 'sensitive', 'running');

    expect(generalRec.safetyLevel).toBe('Caution');
    expect(sensitiveRec.safetyLevel).toBe('Limit Exposure');
  });

  it('recommends avoiding outdoors at unhealthy AQI levels', () => {
    const unhealthyDataset = makeDataset(175, 85);
    const rec = generateRuleBasedRecommendation(unhealthyDataset, 'child', 'sports');

    expect(rec.safetyLevel).toBe('Avoid Outdoors');
    expect(rec.maskGuidance).toContain('N95');
  });

  it('builds a complete 6-part structured fallback answer when Gemini is unavailable', () => {
    const dataset = makeDataset(115, 42);
    const advice = buildRuleBasedStructuredAdvice(
      'Is wearing an N95 mask useful today?',
      'Bengaluru',
      dataset,
      'sensitive',
      'walking'
    );

    expect(advice.shortAnswer).toContain('N95');
    expect(advice.currentConditions).toContain('Bengaluru');
    expect(advice.precautions.length).toBeGreaterThan(0);
    expect(advice.limitations).toContain('not medical advice');
  });
});
