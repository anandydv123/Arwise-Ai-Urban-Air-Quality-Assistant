import {
  AlertCircle,
  Clock,
  Cloud,
  Droplets,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext.tsx';
import {
  POLLUTANT_DEFINITIONS,
  classifyAqi,
  evaluatePollutantStatus,
  formatObservedTimestamp,
} from '../utils/aqi.ts';
import { AqiGauge } from './AqiGauge.tsx';
import { LocationControls } from './LocationControls.tsx';
import { RecommendationPanel } from './RecommendationPanel.tsx';

export function DashboardView() {
  const {
    location,
    dataset,
    loading,
    error,
    refreshAirQuality,
    aqiStandard,
    setActiveSection,
  } = useAppContext();

  const current = dataset?.current ?? null;
  const activeAqi = current
    ? aqiStandard === 'eu'
      ? current.europeanAqi
      : current.usAqi
    : null;
  const category = classifyAqi(activeAqi, aqiStandard);

  return (
    <div className="space-y-6">
      <LocationControls />

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" aria-hidden="true" />
            <div>
              <p className="font-semibold">Live air quality data is currently unavailable</p>
              <p className="mt-0.5 text-xs opacity-90">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshAirQuality}
            className="self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 whitespace-nowrap sm:self-center dark:border-red-800 dark:bg-slate-900 dark:text-red-200"
          >
            Retry Fetch
          </button>
        </div>
      )}

      <section
        aria-label="Current location overview"
        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 text-balance dark:text-slate-50">
            {[location.name, location.region, location.country].filter(Boolean).join(', ')}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">
              {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
            </span>
            <span aria-hidden="true">·</span>
            <span>Source: {location.source}</span>
            {dataset?.location.timezone && (
              <>
                <span aria-hidden="true">·</span>
                <span>{dataset.location.timezone}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Last observed:{' '}
            <strong className="font-mono font-medium tabular-nums text-slate-800 dark:text-slate-200">
              {loading
                ? 'Updating...'
                : formatObservedTimestamp(current?.observedAt ?? null, dataset?.location.timezone)}
            </strong>
          </span>
        </div>
      </section>

      {loading && !dataset ? (
        <div
          aria-busy="true"
          aria-label="Loading air quality measurements"
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-slate-100 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <AqiGauge
            usAqi={current?.usAqi ?? null}
            europeanAqi={current?.europeanAqi ?? null}
            standard={aqiStandard}
            pollutants={current?.pollutants ?? null}
          />

          <div className="flex flex-col justify-between gap-6 lg:col-span-2">
            {/* Weather Strip */}
            <section
              aria-label="Current weather conditions"
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Weather & Dispersion Conditions
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Current Open-Meteo weather
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Temperature</span>
                  </div>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {current?.weather.temperatureC !== null && current?.weather.temperatureC !== undefined
                      ? `${current.weather.temperatureC}°C`
                      : '—'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Humidity</span>
                  </div>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {current?.weather.humidityPercent !== null &&
                    current?.weather.humidityPercent !== undefined
                      ? `${current.weather.humidityPercent}%`
                      : '—'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Wind Speed</span>
                  </div>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {current?.weather.windSpeedKmh !== null &&
                    current?.weather.windSpeedKmh !== undefined
                      ? `${current.weather.windSpeedKmh} km/h`
                      : '—'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Conditions</span>
                  </div>
                  <p className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {current?.weather.weatherLabel ?? 'Unavailable'}
                  </p>
                </div>
              </div>
            </section>

            {/* Six Criteria Pollutants */}
            <section
              aria-label="Current pollutant concentrations"
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Pollutant Concentrations
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSection('live')}
                  className="text-xs font-medium text-teal-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-teal-400"
                >
                  Detailed breakdown →
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {POLLUTANT_DEFINITIONS.map((def) => {
                  const val = current ? current.pollutants[def.key] : null;
                  const status = evaluatePollutantStatus(val, def.who24hGuideline);

                  return (
                    <div
                      key={def.key}
                      className="border-t border-slate-100 pt-3 dark:border-slate-800"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {def.code}
                        </span>
                        <span className={`text-xs font-medium ${status.toneClass}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {val !== null ? val : '—'}
                        </span>
                        <span className="font-mono text-xs text-slate-400">{def.unit}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {def.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* AQI Plain-English Meaning & Quick Action */}
      {current && (
        <section
          aria-label="What current AQI means"
          className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Current Air Quality Meaning</span>
              <span aria-hidden="true">·</span>
              <span>{aqiStandard === 'eu' ? 'European Index' : 'US EPA Index'}</span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200">
              With an index of{' '}
              <strong className="font-mono tabular-nums">{activeAqi ?? '—'}</strong> (
              <strong>{category.label}</strong>): {category.summary}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('forecast')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              24h Forecast
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('assistant')}
              className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              Ask AI Advisor
            </button>
          </div>
        </section>
      )}

      <RecommendationPanel />

      {dataset && (
        <footer className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <span>
            {dataset.attribution.airQuality} · {dataset.attribution.weather}
          </span>
          <span>{dataset.attribution.note}</span>
        </footer>
      )}
    </div>
  );
}
