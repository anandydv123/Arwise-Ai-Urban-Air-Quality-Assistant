import {
  Activity,
  Bell,
  Bot,
  Compass,
  Info,
  LayoutDashboard,
  TrendingUp,
  Wind,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import type { AppSection } from '../types/airQuality.ts';

interface NavItem {
  id: AppSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'live', label: 'Live Air Quality', icon: Activity },
  { id: 'map', label: 'Air Quality Map', icon: Compass },
  { id: 'forecast', label: 'Forecast & Trends', icon: TrendingUp },
  { id: 'assistant', label: 'AI Health Assistant', icon: Bot },
  { id: 'alerts', label: 'Smart Alerts', icon: Bell },
  { id: 'about', label: 'About & Data Sources', icon: Info },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { activeSection, setActiveSection, alerts, location } = useAppContext();

  const handleSelect = (id: AppSection) => {
    setActiveSection(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6 dark:bg-slate-900">
      <div>
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white dark:bg-teal-600">
              <Wind className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-slate-100">
              AirWise AI
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const showAlertCount = item.id === 'alerts' && alerts.length > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? 'text-teal-700 dark:text-teal-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </span>
                {showAlertCount && (
                  <span
                    aria-label={`${alerts.length} active alerts`}
                    className="font-mono text-xs font-semibold tabular-nums text-red-700 dark:text-red-400"
                  >
                    {alerts.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 pt-4 px-2 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Monitoring coordinates
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {location.name}
        </p>
        <p className="mt-0.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 lg:block dark:border-slate-800">
        {navContent}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[85vw] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
