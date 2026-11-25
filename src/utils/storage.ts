import type { AlertThresholds, LocationInfo } from '../types/airQuality.ts';
import { DEFAULT_ALERT_THRESHOLDS } from './alerts.ts';
import { DEFAULT_FALLBACK_LOCATION } from './aqi.ts';

export type ThemeMode = 'light' | 'dark';

const RECENT_STORAGE_KEY = 'airwise_recent_locations_v1';
const THEME_STORAGE_KEY = 'airwise_theme_v1';
const THRESHOLDS_STORAGE_KEY = 'airwise_alert_thresholds_v1';

/**
 * Reads recently viewed locations from localStorage with safe fallback.
 */
export function readStoredRecentLocations(): LocationInfo[] {
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [DEFAULT_FALLBACK_LOCATION];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_FALLBACK_LOCATION];
    }
    return (parsed as LocationInfo[]).slice(0, 6);
  } catch {
    return [DEFAULT_FALLBACK_LOCATION];
  }
}

/**
 * Persists recently viewed locations to localStorage, ignoring storage quota errors.
 */
export function saveRecentLocations(locations: LocationInfo[]): void {
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(locations.slice(0, 6)));
  } catch {
    // Ignore storage failures in restricted browsing modes
  }
}

/**
 * Reads the persisted theme preference, defaulting to light mode.
 */
export function readStoredTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Ignore storage failures
  }
  return 'light';
}

/**
 * Persists the active theme mode to localStorage.
 */
export function saveTheme(theme: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures
  }
}

/**
 * Reads alert threshold preferences from localStorage with validated defaults.
 */
export function readStoredThresholds(): AlertThresholds {
  try {
    const raw = window.localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    if (!raw) return DEFAULT_ALERT_THRESHOLDS;
    const parsed = JSON.parse(raw) as Partial<AlertThresholds>;
    return {
      usAqiThreshold:
        typeof parsed.usAqiThreshold === 'number' && Number.isFinite(parsed.usAqiThreshold)
          ? parsed.usAqiThreshold
          : DEFAULT_ALERT_THRESHOLDS.usAqiThreshold,
      pm25Threshold:
        typeof parsed.pm25Threshold === 'number' && Number.isFinite(parsed.pm25Threshold)
          ? parsed.pm25Threshold
          : DEFAULT_ALERT_THRESHOLDS.pm25Threshold,
      spikeDeltaThreshold:
        typeof parsed.spikeDeltaThreshold === 'number' && Number.isFinite(parsed.spikeDeltaThreshold)
          ? parsed.spikeDeltaThreshold
          : DEFAULT_ALERT_THRESHOLDS.spikeDeltaThreshold,
      browserNotificationsEnabled: Boolean(parsed.browserNotificationsEnabled),
    };
  } catch {
    return DEFAULT_ALERT_THRESHOLDS;
  }
}

/**
 * Persists alert threshold preferences to localStorage.
 */
export function saveThresholds(thresholds: AlertThresholds): void {
  try {
    window.localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
  } catch {
    // Ignore storage failures
  }
}
