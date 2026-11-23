import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { useId } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import type { ActivityType, SensitivityGroup } from '../types/airQuality.ts';
import { ACTIVITY_OPTIONS, SENSITIVITY_OPTIONS } from '../utils/recommendations.ts';

export function RecommendationPanel() {
  const {
    sensitivityGroup,
    setSensitivityGroup,
    activity,
    setActivity,
    recommendation,
    setActiveSection,
  } = useAppContext();

  const groupSelectId = useId();
  const activitySelectId = useId();

  const safetyStyleMap = {
    Safe: {
      icon: CheckCircle2,
      textClass: 'text-emerald-800 dark:text-emerald-300',
      bgClass: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900',
    },
    Caution: {
      icon: Info,
      textClass: 'text-yellow-800 dark:text-yellow-300',
      bgClass: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/40 dark:border-yellow-900',
    },
    'Limit Exposure': {
      icon: AlertTriangle,
      textClass: 'text-orange-800 dark:text-orange-300',
      bgClass: 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900',
    },
    'Avoid Outdoors': {
      icon: ShieldAlert,
      textClass: 'text-red-800 dark:text-red-300',
      bgClass: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900',
    },
    Unavailable: {
      icon: Info,
      textClass: 'text-slate-700 dark:text-slate-300',
      bgClass: 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700',
    },
  } as const;

  const badge = safetyStyleMap[recommendation.safetyLevel];
  const SafetyIcon = badge.icon;

  return (
    <section
      aria-label="Personalized outdoor recommendation engine"
      className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Personalized Outdoor Guidance
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Deterministic rule-based assessment tailored to your sensitivity group and activity.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={groupSelectId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Sensitivity Profile
            </label>
            <select
              id={groupSelectId}
              value={sensitivityGroup}
              onChange={(e) => setSensitivityGroup(e.target.value as SensitivityGroup)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {SENSITIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={activitySelectId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Planned Activity
            </label>
            <select
              id={activitySelectId}
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityType)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${badge.bgClass} ${badge.textClass}`}
            >
              <SafetyIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{recommendation.safetyLevel}</span>
            </span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {recommendation.headline}
            </h3>
          </div>

          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {recommendation.summary}
          </p>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recommended Precautions
            </h4>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
              {recommendation.precautions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600 dark:bg-teal-400" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              24-Hour Timing Window
            </h4>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {recommendation.bestWindowHint}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Respirator / Mask Guidance
            </h4>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {recommendation.maskGuidance}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Decision Factors
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {recommendation.reasoningFactors.join(' · ')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('assistant')}
            className="w-full rounded-lg border border-teal-700 px-3 py-2 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
          >
            Ask AI Health Assistant a follow-up
          </button>
        </div>
      </div>

      <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {recommendation.limitations}
      </p>
    </section>
  );
}
