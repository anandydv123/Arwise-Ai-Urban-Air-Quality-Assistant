import type { AqiStandard, PollutantReadings } from '../types/airQuality.ts';
import { classifyAqi, identifyDominantPollutant } from '../utils/aqi.ts';

interface AqiGaugeProps {
  usAqi: number | null;
  europeanAqi: number | null;
  standard: AqiStandard;
  pollutants: PollutantReadings | null;
}

export function AqiGauge({ usAqi, europeanAqi, standard, pollutants }: AqiGaugeProps) {
  const activeValue = standard === 'eu' ? europeanAqi : usAqi;
  const maxScale = standard === 'eu' ? 120 : 300;
  const category = classifyAqi(activeValue, standard);
  const dominant = pollutants ? identifyDominantPollutant(pollutants) : null;

  const clampedRatio =
    typeof activeValue === 'number' && Number.isFinite(activeValue)
      ? Math.max(0.03, Math.min(1, activeValue / maxScale))
      : 0;

  // Semi-circle gauge geometry
  const radius = 84;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - clampedRatio);

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      role="region"
      aria-label={`Current ${standard === 'eu' ? 'European' : 'US EPA'} Air Quality Index gauge`}
    >
      <div className="flex w-full items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">
          {standard === 'eu' ? 'European AQI' : 'US EPA AQI'}
        </span>
        <span className="font-mono tabular-nums">
          Scale {category.rangeLabel}
        </span>
      </div>

      <div className="relative mt-4 flex flex-col items-center">
        <svg
          width="220"
          height="128"
          viewBox="0 0 220 128"
          className="overflow-visible"
          role="img"
          aria-label={
            activeValue !== null
              ? `AQI value ${activeValue}, category ${category.label}`
              : 'AQI value unavailable'
          }
        >
          <path
            d="M 26 110 A 84 84 0 0 1 194 110"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
            className="text-slate-100 dark:text-slate-800"
          />
          {activeValue !== null && (
            <path
              d="M 26 110 A 84 84 0 0 1 194 110"
              fill="none"
              stroke={category.hexColor}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 200ms ease-out' }}
            />
          )}
        </svg>

        <div className="-mt-16 text-center">
          <div className="font-mono text-5xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-50">
            {activeValue !== null ? activeValue : '—'}
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${category.badgeBgClass} ${category.badgeTextClass} ${category.borderClass}`}
            >
              <span aria-hidden="true">{category.symbol}</span>
              <span>{category.label}</span>
            </span>
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {category.summary}
      </p>

      <div className="mt-4 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>
          {standard === 'eu' ? 'US EPA AQI' : 'European AQI'}:{' '}
          <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
            {standard === 'eu' ? (usAqi ?? '—') : (europeanAqi ?? '—')}
          </strong>
        </span>
        <span>
          Primary driver:{' '}
          <strong className="font-mono text-slate-800 dark:text-slate-200">
            {dominant ?? '—'}
          </strong>
        </span>
      </div>
    </div>
  );
}
