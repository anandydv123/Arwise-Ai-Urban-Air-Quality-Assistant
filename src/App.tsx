import { AlertTriangle, X } from 'lucide-react';
import { Suspense, lazy, useState } from 'react';
import { AboutSourcesView } from './components/AboutSourcesView.tsx';
import { AiHealthAssistantView } from './components/AiHealthAssistantView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { HeaderBar } from './components/HeaderBar.tsx';
import { LiveAirQualityView } from './components/LiveAirQualityView.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { SmartAlertsView } from './components/SmartAlertsView.tsx';
import { AppProvider, useAppContext } from './contexts/AppContext.tsx';

const AirQualityMapView = lazy(() =>
  import('./components/AirQualityMapView.tsx').then((m) => ({
    default: m.AirQualityMapView,
  }))
);

const ForecastTrendsView = lazy(() =>
  import('./components/ForecastTrendsView.tsx').then((m) => ({
    default: m.ForecastTrendsView,
  }))
);

function SectionLoadingFallback() {
  return (
    <div
      aria-busy="true"
      className="h-96 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
    />
  );
}

export function AppShell() {
  const { activeSection, setActiveSection, alerts, inAppAlertsEnabled } = useAppContext();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);

  const topAlert = alerts[0] ?? null;
  const showBanner =
    inAppAlertsEnabled &&
    topAlert !== null &&
    activeSection !== 'alerts' &&
    dismissedAlertId !== topAlert.id;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-teal-700 focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <Sidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar onOpenMobileNav={() => setMobileNavOpen(true)} />

        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          {showBanner && topAlert && (
            <div
              role="status"
              className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
                topAlert.severity === 'critical'
                  ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                  : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate font-semibold">{topAlert.title}:</span>
                <span className="truncate opacity-90">{topAlert.message}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('alerts')}
                  className="font-semibold underline whitespace-nowrap"
                >
                  Manage Alerts ({alerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedAlertId(topAlert.id)}
                  aria-label="Dismiss alert banner"
                  className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <ErrorBoundary>
            {activeSection === 'dashboard' && <DashboardView />}
            {activeSection === 'live' && <LiveAirQualityView />}
            {activeSection === 'map' && (
              <Suspense fallback={<SectionLoadingFallback />}>
                <AirQualityMapView />
              </Suspense>
            )}
            {activeSection === 'forecast' && (
              <Suspense fallback={<SectionLoadingFallback />}>
                <ForecastTrendsView />
              </Suspense>
            )}
            {activeSection === 'assistant' && <AiHealthAssistantView />}
            {activeSection === 'alerts' && <SmartAlertsView />}
            {activeSection === 'about' && <AboutSourcesView />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
