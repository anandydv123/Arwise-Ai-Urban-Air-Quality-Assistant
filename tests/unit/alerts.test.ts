import { describe, expect, it } from 'vitest';
import type { AirQualityDataset } from '../../src/types/airQuality.ts';
import { DEFAULT_ALERT_THRESHOLDS, evaluateSmartAlerts } from '../../src/utils/alerts.ts';

function buildDataset(currentAqi: number, currentPm25: number, peakForecastAqi: number): AirQualityDataset {
  return {
    location: {
      latitude: 12.97,
      longitude: 77.59,
      timezone: 'Asia/Kolkata',
      elevationMeters: 920,
    },
    current: {
      usAqi: currentAqi,
      europeanAqi: 45,
      pollutants: {
        pm2_5: currentPm25,
        pm10: 40,
        ozone: 50,
        nitrogenDioxide: 20,
        sulfurDioxide: 8,
        carbonMonoxide: 400,
      },
      weather: {
        temperatureC: 24,
        humidityPercent: 60,
        windSpeedKmh: 9,
        weatherCode: 2,
        weatherLabel: 'Partly cloudy',
      },
      observedAt: '2026-11-23T09:00',
    },
    hourlyForecast: [
      {
        time: '2026-11-23T14:00',
        usAqi: peakForecastAqi,
        europeanAqi: 70,
        pm2_5: 55,
        pm10: 80,
        ozone: 65,
        nitrogenDioxide: 30,
      },
    ],
    fetchedAt: '2026-11-23T09:00:00.000Z',
    cached: false,
    attribution: {
      airQuality: 'Open-Meteo',
      weather: 'Open-Meteo',
      note: 'Model',
    },
  };
}

describe('Smart Alerts Evaluator', () => {
  it('returns zero alerts when conditions are below all thresholds', () => {
    const alerts = evaluateSmartAlerts(
      buildDataset(40, 10, 52),
      DEFAULT_ALERT_THRESHOLDS,
      'general',
      'Bengaluru'
    );
    expect(alerts).toHaveLength(0);
  });

  it('triggers unhealthy air, PM2.5, sensitive group, and 24h spike alerts', () => {
    const alerts = evaluateSmartAlerts(
      buildDataset(155, 62, 200),
      DEFAULT_ALERT_THRESHOLDS,
      'sensitive',
      'Bengaluru'
    );

    const types = alerts.map((a) => a.type);
    expect(types).toContain('unhealthy_air');
    expect(types).toContain('sensitive_group');
    expect(types).toContain('pm25_high');
    expect(types).toContain('pollution_spike');
  });
});
