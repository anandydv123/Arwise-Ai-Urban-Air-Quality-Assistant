import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppContext } from '../contexts/AppContext.tsx';
import { formatHourLabel } from '../utils/aqi.ts';
import { LocationControls } from './LocationControls.tsx';

export function ForecastTrendsView() {
  const { location, dataset, loading, error, aqiStandard } = useAppContext();

  const chartData = (dataset?.hourlyForecast ?? []).map((point) => ({
    time: formatHourLabel(point.time),
    rawTime: point.time,
    aqi: aqiStandard === 'eu' ? point.europeanAqi : point.usAqi,
    pm2_5: point.pm2_5,
    pm10: point.pm10,
  }));

  const validAqiPoints = chartData.filter(
    (d): d is typeof d & { aqi: number } => typeof d.aqi === 'number'
  );
  const peakAqi = validAqiPoints.length
    ? validAqiPoints.reduce((acc, cur) => (cur.aqi > acc.aqi ? cur : acc), validAqiPoints[0])
    : null;
  const lowestAqi = validAqiPoints.length
    ? validAqiPoints.reduce((acc, cur) => (cur.aqi < acc.aqi ? cur : acc), validAqiPoints[0])
    : null;

  const validPm25 = chartData.filter(
    (d): d is typeof d & { pm2_5: number } => typeof d.pm2_5 === 'number'
  );
  const peakPm25 = validPm25.length
    ? Math.max(...validPm25.map((d) => d.pm2_5))
    : null;

  return (
    <div className="space-y-6">
      <LocationControls />

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              24-Hour Air Quality Forecast — {location.name}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Predictive hourly model forecast from Open-Meteo (clearly distinct from measured historical data).
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Forecast Index: {aqiStandard === 'eu' ? 'European AQI' : 'US EPA AQI'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border-b border-slate-100 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Forecast Lowest AQI</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {lowestAqi ? lowestAqi.aqi : '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lowestAqi ? `Expected around ${lowestAqi.time}` : 'Unavailable'}
            </p>
          </div>

          <div className="border-b border-slate-100 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Forecast Peak AQI</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-orange-700 dark:text-orange-400">
              {peakAqi ? peakAqi.aqi : '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {peakAqi ? `Expected around ${peakAqi.time}` : 'Unavailable'}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Forecast Peak PM2.5</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {peakPm25 !== null ? `${peakPm25} µg/m³` : '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Next 24h projected maximum</p>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {loading && !dataset ? (
        <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
      ) : chartData.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          24-hour hourly forecast data is currently unavailable for this coordinate.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <section
            aria-label="24-hour AQI forecast chart"
            className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Projected Hourly {aqiStandard === 'eu' ? 'European AQI' : 'US EPA AQI'} (Next 24 Hours)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Model forecast values—use lower-index windows for outdoor exercise planning.
            </p>

            <div className="mt-4 h-72 w-full" role="img" aria-label="Line area chart showing 24-hour projected AQI trend">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="aqi"
                    name={aqiStandard === 'eu' ? 'Forecast EU AQI' : 'Forecast US AQI'}
                    stroke="#0F766E"
                    strokeWidth={2}
                    fill="url(#aqiGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section
            aria-label="24-hour particulate matter forecast chart"
            className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Projected PM2.5 & PM10 Hourly Trend (µg/m³)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hourly particulate concentration forecast across the next 24 hours.
            </p>

            <div className="mt-4 h-72 w-full" role="img" aria-label="Multi-line chart comparing 24-hour PM2.5 and PM10 forecast">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} unit=" µg" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pm2_5"
                    name="Forecast PM2.5 (µg/m³)"
                    stroke="#0284C7"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="pm10"
                    name="Forecast PM10 (µg/m³)"
                    stroke="#EA580C"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
