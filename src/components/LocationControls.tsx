import { Crosshair, History, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';
import { searchCitiesApi } from '../services/api.ts';
import type { LocationInfo } from '../types/airQuality.ts';

export function LocationControls() {
  const {
    location,
    recentLocations,
    selectLocation,
    selectCoordinates,
    requestGeolocation,
    geolocationStatus,
    geolocationMessage,
  } = useAppContext();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);
  const [results, setResults] = useState<LocationInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [showCoordForm, setShowCoordForm] = useState(false);
  const [latInput, setLatInput] = useState(location.latitude.toString());
  const [lonInput, setLonInput] = useState(location.longitude.toString());
  const [coordError, setCoordError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputId = useId();
  const latInputId = useId();
  const lonInputId = useId();

  useEffect(() => {
    setLatInput(location.latitude.toFixed(4));
    setLonInput(location.longitude.toFixed(4));
  }, [location.latitude, location.longitude]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError(null);

    searchCitiesApi(trimmed, controller.signal)
      .then((items) => {
        setResults(items);
        setDropdownOpen(true);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSearchError(err instanceof Error ? err.message : 'Unable to search cities.');
        setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectCity = (city: LocationInfo) => {
    selectLocation(city);
    setQuery('');
    setResults([]);
    setDropdownOpen(false);
  };

  const handleCoordinateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(latInput);
    const lon = Number(lonInput);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setCoordError('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setCoordError('Longitude must be a valid number between -180 and 180.');
      return;
    }

    setCoordError(null);
    setShowCoordForm(false);
    await selectCoordinates(lat, lon, 'coordinates');
  };

  return (
    <section
      aria-label="Location selection and search"
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div ref={containerRef} className="relative flex-1 max-w-xl">
          <label htmlFor={searchInputId} className="sr-only">
            Search city for air quality
          </label>
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              id={searchInputId}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim().length >= 2) {
                  setDropdownOpen(true);
                }
              }}
              onFocus={() => {
                if (results.length > 0) setDropdownOpen(true);
              }}
              placeholder="Search city or region (e.g., Tokyo, London, Mumbai)..."
              aria-expanded={dropdownOpen && (results.length > 0 || searchLoading || Boolean(searchError))}
              aria-autocomplete="list"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500"
            />
          </div>

          {dropdownOpen && (searchLoading || searchError || results.length > 0 || debouncedQuery.trim().length >= 2) && (
            <div
              role="listbox"
              aria-label="City search suggestions"
              className="absolute left-0 right-0 z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              {searchLoading && (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  Searching cities...
                </div>
              )}
              {!searchLoading && searchError && (
                <div className="px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {searchError}
                </div>
              )}
              {!searchLoading && !searchError && results.length === 0 && debouncedQuery.trim().length >= 2 && (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No matching cities found for &ldquo;{debouncedQuery.trim()}&rdquo;.
                </div>
              )}
              {!searchLoading &&
                !searchError &&
                results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    onClick={() => handleSelectCity(item)}
                    className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:outline-none dark:border-slate-800 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <MapPin className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                      <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </span>
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {[item.region, item.country].filter(Boolean).join(', ')}
                      </span>
                    </span>
                    <span className="ml-3 shrink-0 font-mono text-xs tabular-nums text-slate-400">
                      {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={requestGeolocation}
            disabled={geolocationStatus === 'requesting'}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {geolocationStatus === 'requesting' ? 'Detecting location...' : 'Use my location'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowCoordForm((prev) => !prev)}
            aria-expanded={showCoordForm}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Coordinates</span>
          </button>
        </div>
      </div>

      {showCoordForm && (
        <form
          onSubmit={handleCoordinateSubmit}
          className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end dark:border-slate-800"
        >
          <div className="flex-1">
            <label
              htmlFor={latInputId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Latitude (-90 to 90)
            </label>
            <input
              id={latInputId}
              type="number"
              step="any"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor={lonInputId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Longitude (-180 to 180)
            </label>
            <input
              id={lonInputId}
              type="number"
              step="any"
              value={lonInput}
              onChange={(e) => setLonInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Apply Coordinates
          </button>
          {coordError && (
            <p role="alert" className="text-xs text-red-700 dark:text-red-400">
              {coordError}
            </p>
          )}
        </form>
      )}

      {geolocationMessage && (
        <div
          role="status"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {geolocationMessage}
        </div>
      )}

      {recentLocations.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Recent:
          </span>
          {recentLocations.map((item) => {
            const isCurrent =
              Math.abs(item.latitude - location.latitude) < 0.005 &&
              Math.abs(item.longitude - location.longitude) < 0.005;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectLocation(item)}
                className={`rounded-md px-2 py-1 text-xs transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-600 ${
                  isCurrent
                    ? 'bg-teal-50 font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
