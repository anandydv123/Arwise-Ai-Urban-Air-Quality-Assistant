import { describe, expect, it } from 'vitest';
import {
  classifyEuropeanAqi,
  classifyUsAqi,
  describeWmoWeatherCode,
  identifyDominantPollutant,
  sanitizeAqiValue,
  sanitizePollutantValue,
} from '../../src/utils/aqi.ts';

describe('AQI Classification & Pollutant Utilities', () => {
  it('classifies US EPA AQI across all six categories and invalid values', () => {
    expect(classifyUsAqi(28).key).toBe('good');
    expect(classifyUsAqi(75).key).toBe('moderate');
    expect(classifyUsAqi(125).key).toBe('sensitive');
    expect(classifyUsAqi(175).key).toBe('unhealthy');
    expect(classifyUsAqi(250).key).toBe('very_unhealthy');
    expect(classifyUsAqi(360).key).toBe('hazardous');
    expect(classifyUsAqi(null).key).toBe('unavailable');
    expect(classifyUsAqi(-5).key).toBe('unavailable');
  });

  it('classifies European AQI across all six categories', () => {
    expect(classifyEuropeanAqi(12).key).toBe('good');
    expect(classifyEuropeanAqi(32).label).toBe('Fair');
    expect(classifyEuropeanAqi(55).label).toBe('Moderate');
    expect(classifyEuropeanAqi(70).label).toBe('Poor');
    expect(classifyEuropeanAqi(92).label).toBe('Very Poor');
    expect(classifyEuropeanAqi(120).label).toBe('Extremely Poor');
    expect(classifyEuropeanAqi(undefined).key).toBe('unavailable');
  });

  it('sanitizes pollutant and AQI numeric values', () => {
    expect(sanitizePollutantValue(14.56)).toBe(14.6);
    expect(sanitizePollutantValue(-2)).toBeNull();
    expect(sanitizePollutantValue(Number.NaN)).toBeNull();
    expect(sanitizeAqiValue(84.4)).toBe(84);
    expect(sanitizeAqiValue(1200)).toBeNull();
  });

  it('identifies the dominant pollutant relative to WHO guidelines', () => {
    const dominant = identifyDominantPollutant({
      pm2_5: 45, // 3x WHO 15
      pm10: 50, // 1.1x WHO 45
      ozone: 60,
      nitrogenDioxide: 20,
      sulfurDioxide: 5,
      carbonMonoxide: 300,
    });
    expect(dominant).toBe('PM2.5');
  });

  it('maps WMO weather codes to human-readable descriptions', () => {
    expect(describeWmoWeatherCode(0)).toBe('Clear sky');
    expect(describeWmoWeatherCode(45)).toBe('Fog or mist');
    expect(describeWmoWeatherCode(95)).toBe('Thunderstorm');
    expect(describeWmoWeatherCode(null)).toBe('Weather unavailable');
  });
});
