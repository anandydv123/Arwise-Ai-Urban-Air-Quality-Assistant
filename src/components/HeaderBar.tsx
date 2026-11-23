import { Menu, Moon, RefreshCw, Sun } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext.tsx';
import type { AppSection } from '../types/airQuality.ts';

const SECTION_TITLES: Record<AppSection, string> = {
  dashboard: 'Dashboard',
  live: 'Live Air Quality',
  map: 'Air Quality Map',
  forecast: 'Forecast & Trends',
  assistant: 'AI Health Assistant',
  alerts: 'Smart Alerts',
  about: 'About & Data Sources',
};

interface HeaderBarProps {
  onOpenMobileNav: () => void;
}

export function HeaderBar({ onOpenMobileNav }: HeaderBarProps) {
  const {
    activeSection,
    location,
    aqiStandard,
    setAqiStandard,
    loading,
    refreshAirQuality,
    theme,
    toggleTheme,
  } = useAppContext();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900 whitespace-nowrap dark:text-slate-100">
              {SECTION_TITLES[activeSection]}
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>
            <span className="truncate text-slate-600 dark:text-slate-300">
              {[location.name, location.country].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div
          role="group"
          aria-label="Air Quality Index standard"
          className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
        >
          <button
            type="button"
            onClick={() => setAqiStandard('us')}
            aria-pressed={aqiStandard === 'us'}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-600 ${
              aqiStandard === 'us'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            US EPA
          </button>
          <button
            type="button"
            onClick={() => setAqiStandard('eu')}
            aria-pressed={aqiStandard === 'eu'}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-600 ${
              aqiStandard === 'eu'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            EU AQI
          </button>
        </div>

        <button
          type="button"
          onClick={refreshAirQuality}
          disabled={loading}
          aria-label="Refresh air quality data"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-50 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Sun className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
