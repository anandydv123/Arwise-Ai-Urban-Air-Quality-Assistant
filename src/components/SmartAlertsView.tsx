import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useId, useState } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import { dispatchBrowserNotification } from '../utils/alerts.ts';

export function SmartAlertsView() {
  const {
    location,
    alerts,
    alertThresholds,
    updateAlertThresholds,
    notificationPermission,
    notificationFeedback,
    inAppAlertsEnabled,
    setInAppAlertsEnabled,
    enableBrowserNotifications,
  } = useAppContext();

  const [testNotice, setTestNotice] = useState<string | null>(null);
  const aqiThreshId = useId();
  const pm25ThreshId = useId();
  const spikeThreshId = useId();

  const handleTestNotification = () => {
    const sent = dispatchBrowserNotification(
      `AirWise AI Alert Test — ${location.name}`,
      'Browser notifications are active while AirWise AI remains open.'
    );
    setTestNotice(
      sent
        ? 'Test notification sent to your browser.'
        : 'Browser notification permission is not granted yet.'
    );
  };

  const handleToggleGrantedNotifications = () => {
    const nextEnabled = !alertThresholds.browserNotificationsEnabled;
    updateAlertThresholds({ browserNotificationsEnabled: nextEnabled });
    if (nextEnabled) {
      dispatchBrowserNotification(
        `AirWise AI Notifications Active — ${location.name}`,
        'Browser notifications are enabled while AirWise AI remains open.'
      );
      setTestNotice('Browser notifications turned on.');
    } else {
      setTestNotice('Browser notifications paused.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Smart Alerts & Thresholds
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Evaluates live air quality and 24-hour forecast spikes for{' '}
              <strong>{location.name}</strong> while this application is open.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setInAppAlertsEnabled(!inAppAlertsEnabled)}
              aria-pressed={inAppAlertsEnabled}
              className={`rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                inAppAlertsEnabled
                  ? 'border-teal-700 bg-teal-50 text-teal-900 dark:border-teal-500 dark:bg-teal-950/60 dark:text-teal-200'
                  : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200'
              }`}
            >
              {inAppAlertsEnabled ? 'In-App Banner: On' : 'In-App Banner: Off'}
            </button>

            {notificationPermission === 'unsupported' ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                Browser notifications unsupported
              </span>
            ) : notificationPermission === 'granted' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleGrantedNotifications}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                    alertThresholds.browserNotificationsEnabled
                      ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800 dark:border-teal-500 dark:bg-teal-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {alertThresholds.browserNotificationsEnabled
                    ? 'Browser Notifications: On'
                    : 'Enable Browser Notifications'}
                </button>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Send Test
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void enableBrowserNotifications()}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {notificationPermission === 'denied'
                    ? 'Retry Browser Notifications'
                    : 'Enable Browser Notifications'}
                </span>
              </button>
            )}
          </div>
        </div>

        {notificationFeedback && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-3.5 py-2.5 text-xs ${
              notificationFeedback.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                : notificationFeedback.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
                  : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {notificationFeedback.message}
          </div>
        )}

        {notificationPermission === 'denied' && !notificationFeedback && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            Browser notification permission is currently blocked (common inside embedded preview frames or when site notifications are disabled). In-app smart alert banners remain active, and you can open the app in its own browser tab to grant native OS notifications.
          </div>
        )}

        {testNotice && (
          <p role="status" className="mt-3 text-xs text-teal-700 dark:text-teal-400">
            {testNotice}
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label
              htmlFor={aqiThreshId}
              className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <span>US AQI Warning Threshold</span>
              <span className="font-mono font-semibold tabular-nums">
                {alertThresholds.usAqiThreshold}
              </span>
            </label>
            <input
              id={aqiThreshId}
              type="range"
              min={50}
              max={250}
              step={5}
              value={alertThresholds.usAqiThreshold}
              onChange={(e) =>
                updateAlertThresholds({ usAqiThreshold: Number(e.target.value) })
              }
              className="mt-2 w-full accent-teal-700"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Alert when current US AQI reaches or exceeds this value.
            </p>
          </div>

          <div>
            <label
              htmlFor={pm25ThreshId}
              className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <span>PM2.5 Threshold (µg/m³)</span>
              <span className="font-mono font-semibold tabular-nums">
                {alertThresholds.pm25Threshold} µg/m³
              </span>
            </label>
            <input
              id={pm25ThreshId}
              type="range"
              min={15}
              max={150}
              step={5}
              value={alertThresholds.pm25Threshold}
              onChange={(e) =>
                updateAlertThresholds({ pm25Threshold: Number(e.target.value) })
              }
              className="mt-2 w-full accent-teal-700"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              WHO 24h guideline is 15 µg/m³; EPA 24h standard is 35 µg/m³.
            </p>
          </div>

          <div>
            <label
              htmlFor={spikeThreshId}
              className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <span>24h Spike Delta (US AQI)</span>
              <span className="font-mono font-semibold tabular-nums">
                +{alertThresholds.spikeDeltaThreshold}
              </span>
            </label>
            <input
              id={spikeThreshId}
              type="range"
              min={15}
              max={100}
              step={5}
              value={alertThresholds.spikeDeltaThreshold}
              onChange={(e) =>
                updateAlertThresholds({ spikeDeltaThreshold: Number(e.target.value) })
              }
              className="mt-2 w-full accent-teal-700"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Warn when forecast AQI rises sharply above current levels.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Active evaluated alerts"
        className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Active Alerts for {location.name} ({alerts.length})
        </h2>

        {alerts.length === 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>
              No configured air quality thresholds are currently breached for this location.
            </span>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {alerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              return (
                <li
                  key={alert.id}
                  className={`flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between ${
                    isCritical
                      ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isCritical ? (
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed opacity-90">{alert.message}</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold tabular-nums">
                    {alert.metricValue}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Note: Alert evaluation runs automatically when fresh telemetry is loaded or thresholds change while AirWise AI is open in your browser. It does not run background push monitoring when the tab is closed.
        </p>
      </section>
    </div>
  );
}
