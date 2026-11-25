import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_ALERT_THRESHOLDS } from '../../src/utils/alerts.ts';
import { DEFAULT_FALLBACK_LOCATION } from '../../src/utils/aqi.ts';
import {
  readStoredRecentLocations,
  readStoredTheme,
  readStoredThresholds,
  saveRecentLocations,
  saveTheme,
  saveThresholds,
} from '../../src/utils/storage.ts';

describe('storage persistence utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('falls back safely on corrupted localStorage values', () => {
    window.localStorage.setItem('airwise_recent_locations_v1', '{invalid-json');
    window.localStorage.setItem('airwise_theme_v1', 'unknown-theme');
    window.localStorage.setItem('airwise_alert_thresholds_v1', '{broken');

    expect(readStoredRecentLocations()).toEqual([DEFAULT_FALLBACK_LOCATION]);
    expect(readStoredTheme()).toBe('light');
    expect(readStoredThresholds()).toEqual(DEFAULT_ALERT_THRESHOLDS);
  });

  it('persists and retrieves recent locations, theme, and alert thresholds', () => {
    saveTheme('dark');
    expect(readStoredTheme()).toBe('dark');

    saveThresholds({
      usAqiThreshold: 120,
      pm25Threshold: 40,
      spikeDeltaThreshold: 25,
      browserNotificationsEnabled: true,
    });
    expect(readStoredThresholds()).toEqual({
      usAqiThreshold: 120,
      pm25Threshold: 40,
      spikeDeltaThreshold: 25,
      browserNotificationsEnabled: true,
    });

    const locations = Array.from({ length: 8 }, (_, idx) => ({
      ...DEFAULT_FALLBACK_LOCATION,
      id: `loc-${idx}`,
      name: `City ${idx}`,
    }));
    saveRecentLocations(locations);
    expect(readStoredRecentLocations()).toHaveLength(6);
  });
});
