import { Wind } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext.tsx';
import {
  POLLUTANT_DEFINITIONS,
  classifyAqi,
  evaluatePollutantStatus,
  formatObservedTimestamp,
} from '../utils/aqi.ts';
import { LocationControls } from './LocationControls.tsx';

export function LiveAirQualityView() {
  const { location, dataset, loading, error, aqiStandard } = useAppContext();
  const current = dataset?.current ?? null;
  const usCat = classifyAqi(current?.usAqi ?? null, 'us');
  const euCat = classifyAqi(current?.europeanAqi ?? null, 'eu');

  return (
    <div className="space-y-6">
      <LocationControls />

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Live Pollutant Telemetry — {location.name}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Current gridded model readings · Observed{' '}
              <span className="font-mono tabular-nums">
                {formatObservedTimestamp(current?.observedAt ?? null, dataset?.location.timezone)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-semibold ${usCat.badgeBgClass} ${usCat.badgeTextClass} ${usCat.borderClass}`}
            >
              <span aria-hidden="true">{usCat.symbol}</span>
              <span>US AQI: {current?.usAqi ?? '—'} ({usCat.shortLabel})</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-semibold ${euCat.badgeBgClass} ${euCat.badgeTextClass} ${euCat.borderClass}`}
            >
              <span aria-hidden="true">{euCat.symbol}</span>
              <span>EU AQI: {current?.europeanAqi ?? '—'} ({euCat.shortLabel})</span>
            </span>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        {loading && !dataset ? (
          <div className="mt-6 h-64 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="py-3 pr-4">Pollutant</th>
                  <th scope="col" className="py-3 px-4 text-right">Current Level</th>
                  <th scope="col" className="py-3 px-4">WHO Benchmark</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 pl-4">Health Mechanism & Sources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {POLLUTANT_DEFINITIONS.map((def) => {
                  const val = current ? current.pollutants[def.key] : null;
                  const status = evaluatePollutantStatus(val, def.who24hGuideline);
                  const ratioPct =
                    val !== null ? Math.min(100, Math.round((val / def.who24hGuideline) * 50)) : 0;

                  return (
                    <tr key={def.key} className="align-top">
                      <td className="py-4 pr-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {def.code}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{def.name}</div>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {val !== null ? val : '—'}
                        </span>
                        <span className="ml-1 font-mono text-xs text-slate-400">{def.unit}</span>
                        <div
                          className="mt-1.5 ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full bg-teal-600 dark:bg-teal-400"
                            style={{ width: `${ratioPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {def.whoUnitNote}
                      </td>
                      <td className={`py-4 px-4 text-xs font-semibold whitespace-nowrap ${status.toneClass}`}>
                        {status.label}
                      </td>
                      <td className="py-4 pl-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        <p>{def.description}</p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">{def.healthEffect}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Wind className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          <h2>Meteorological Dispersion Summary</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {current?.weather.windSpeedKmh !== null && current?.weather.windSpeedKmh !== undefined
            ? current.weather.windSpeedKmh < 8
              ? `Current wind speed is light (${current.weather.windSpeedKmh} km/h). Low wind speeds slow horizontal dispersion and can allow urban emissions to accumulate near ground level.`
              : `Current wind speed is ${current.weather.windSpeedKmh} km/h (${current.weather.weatherLabel}), which supports active atmospheric mixing and pollutant dispersion.`
            : 'Current wind dispersion telemetry is unavailable for this request.'}{' '}
          Active display index: <strong>{aqiStandard === 'eu' ? 'European AQI' : 'US EPA AQI'}</strong>.
        </p>
      </section>
    </div>
  );
}
