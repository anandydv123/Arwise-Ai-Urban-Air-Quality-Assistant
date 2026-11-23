import type {
  AirQualityDataset,
  AlertThresholds,
  SensitivityGroup,
  SmartAlertItem,
} from '../types/airQuality.ts';
import { classifyUsAqi, formatHourLabel } from './aqi.ts';

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  usAqiThreshold: 100,
  pm25Threshold: 35,
  spikeDeltaThreshold: 35,
  browserNotificationsEnabled: false,
};

export function evaluateSmartAlerts(
  dataset: AirQualityDataset | null,
  thresholds: AlertThresholds,
  group: SensitivityGroup,
  locationName: string
): SmartAlertItem[] {
  if (!dataset || dataset.current.usAqi === null) {
    return [];
  }

  const alerts: SmartAlertItem[] = [];
  const now = new Date().toISOString();
  const currentAqi = dataset.current.usAqi;
  const currentPm25 = dataset.current.pollutants.pm2_5;
  const category = classifyUsAqi(currentAqi);

  if (currentAqi >= 151) {
    alerts.push({
      id: `unhealthy-${currentAqi}`,
      type: 'unhealthy_air',
      severity: 'critical',
      title: `Unhealthy Air Warning in ${locationName}`,
      message: `Current US AQI is ${currentAqi} (${category.label}). Move strenuous activity indoors and minimize prolonged outdoor exposure.`,
      metricValue: `US AQI ${currentAqi}`,
      triggeredAt: now,
    });
  } else if (currentAqi >= thresholds.usAqiThreshold) {
    alerts.push({
      id: `high-aqi-${currentAqi}`,
      type: 'high_aqi',
      severity: 'warning',
      title: `Configured AQI Threshold Exceeded`,
      message: `Current US AQI (${currentAqi}) has crossed your alert threshold of ${thresholds.usAqiThreshold}.`,
      metricValue: `US AQI ${currentAqi}`,
      triggeredAt: now,
    });
  }

  const isSensitiveProfile = group === 'child' || group === 'senior' || group === 'sensitive';
  if (isSensitiveProfile && currentAqi >= 80) {
    alerts.push({
      id: `sensitive-${group}-${currentAqi}`,
      type: 'sensitive_group',
      severity: currentAqi >= 101 ? 'critical' : 'warning',
      title: 'Sensitive Group Advisory',
      message: `At US AQI ${currentAqi} (${category.label}), children, older adults, and respiratory-sensitive individuals should pace outdoor exertion.`,
      metricValue: `US AQI ${currentAqi}`,
      triggeredAt: now,
    });
  }

  if (currentPm25 !== null && currentPm25 >= thresholds.pm25Threshold) {
    alerts.push({
      id: `pm25-${currentPm25}`,
      type: 'pm25_high',
      severity: currentPm25 >= 55 ? 'critical' : 'warning',
      title: 'Elevated Fine Particulate Matter (PM2.5)',
      message: `PM2.5 concentration is ${currentPm25} µg/m³, above your ${thresholds.pm25Threshold} µg/m³ threshold.`,
      metricValue: `${currentPm25} µg/m³`,
      triggeredAt: now,
    });
  }

  // Check next 24h forecast for a significant pollution spike
  const validForecast = dataset.hourlyForecast.filter(
    (h): h is typeof h & { usAqi: number } => typeof h.usAqi === 'number'
  );
  if (validForecast.length > 0) {
    let peak = validForecast[0];
    for (const point of validForecast) {
      if (point.usAqi > peak.usAqi) {
        peak = point;
      }
    }
    const delta = peak.usAqi - currentAqi;
    if (delta >= thresholds.spikeDeltaThreshold) {
      alerts.push({
        id: `spike-${peak.usAqi}-${peak.time}`,
        type: 'pollution_spike',
        severity: peak.usAqi >= 151 ? 'critical' : 'warning',
        title: 'Forecasted 24-Hour Pollution Increase',
        message: `Model forecast projects US AQI rising by +${delta} points to ${peak.usAqi} around ${formatHourLabel(peak.time)}.`,
        metricValue: `+${delta} AQI`,
        triggeredAt: now,
      });
    }
  }

  return alerts;
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  try {
    const result = await new Promise<NotificationPermission>((resolve) => {
      const maybePromise = Notification.requestPermission((perm) => resolve(perm));
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(resolve).catch(() => resolve(Notification.permission));
      }
    });
    return result;
  } catch {
    return Notification.permission;
  }
}

export function dispatchBrowserNotification(title: string, body: string): boolean {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }
  try {
    new Notification(title, {
      body,
      tag: 'airwise-smart-alert',
    });
    return true;
  } catch {
    return false;
  }
}
