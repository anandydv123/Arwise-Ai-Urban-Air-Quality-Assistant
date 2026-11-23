import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import { classifyAqi, getCategoryLegend } from '../utils/aqi.ts';
import { LocationControls } from './LocationControls.tsx';

export function AirQualityMapView() {
  const { location, dataset, aqiStandard, selectCoordinates, loading } = useAppContext();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const selectCoordinatesRef = useRef(selectCoordinates);

  useEffect(() => {
    selectCoordinatesRef.current = selectCoordinates;
  }, [selectCoordinates]);

  const current = dataset?.current ?? null;
  const activeAqi = current
    ? aqiStandard === 'eu'
      ? current.europeanAqi
      : current.usAqi
    : null;
  const category = classifyAqi(activeAqi, aqiStandard);
  const legend = getCategoryLegend(aqiStandard);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [location.latitude, location.longitude],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      void selectCoordinatesRef.current(event.latlng.lat, event.latlng.lng, 'map');
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker, AQI radius ring, and map viewport when location or AQI updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const latLng: L.LatLngExpression = [location.latitude, location.longitude];
    map.setView(latLng, Math.max(map.getZoom(), 10), { animate: true });

    const labelText = activeAqi !== null ? String(activeAqi) : '—';
    const icon = L.divIcon({
      className: 'airwise-map-marker',
      html: `<div style="background:${category.hexColor};color:#ffffff;border:2px solid #ffffff;border-radius:9999px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(15,23,42,0.35);">${labelText}</div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
      markerRef.current.setIcon(icon);
    } else {
      markerRef.current = L.marker(latLng, { icon }).addTo(map);
    }

    markerRef.current.bindPopup(
      `<div style="font-family:sans-serif;min-width:170px;">
        <strong>${location.name}</strong><br/>
        <span>${aqiStandard === 'eu' ? 'European AQI' : 'US EPA AQI'}: <strong>${labelText}</strong> (${category.label})</span><br/>
        <span style="font-size:11px;color:#475569;">PM2.5: ${current?.pollutants.pm2_5 ?? '—'} µg/m³</span>
      </div>`
    );

    if (circleRef.current) {
      circleRef.current.setLatLng(latLng);
      circleRef.current.setStyle({
        color: category.hexColor,
        fillColor: category.hexColor,
      });
    } else {
      circleRef.current = L.circle(latLng, {
        radius: 6000,
        color: category.hexColor,
        fillColor: category.hexColor,
        fillOpacity: 0.18,
        weight: 2,
      }).addTo(map);
    }
  }, [
    location.latitude,
    location.longitude,
    location.name,
    activeAqi,
    aqiStandard,
    category.hexColor,
    category.label,
    current?.pollutants.pm2_5,
  ]);

  return (
    <div className="space-y-6">
      <LocationControls />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section
          aria-label="Interactive air quality map"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-2 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
            <div>
              <h1 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Interactive Location Map
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click anywhere on the map to inspect Open-Meteo air quality at those coordinates.
              </p>
            </div>
            {loading && (
              <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
                Updating...
              </span>
            )}
          </div>

          <div
            ref={mapContainerRef}
            className="h-[440px] w-full bg-slate-100 dark:bg-slate-800"
            aria-label={`Map centered on ${location.name}`}
          />
        </section>

        <aside
          aria-label="Map telemetry and AQI legend"
          className="flex flex-col justify-between gap-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Selected Grid Point
            </h2>
            <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
              {[location.name, location.country].filter(Boolean).join(', ')}
            </p>
            <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {aqiStandard === 'eu' ? 'European AQI' : 'US EPA AQI'}
                </p>
                <p className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                  {activeAqi ?? '—'}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${category.badgeBgClass} ${category.badgeTextClass} ${category.borderClass}`}
              >
                <span aria-hidden="true">{category.symbol}</span>
                <span>{category.shortLabel}</span>
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">PM2.5</dt>
                <dd className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {current?.pollutants.pm2_5 ?? '—'} µg/m³
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">PM10</dt>
                <dd className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {current?.pollutants.pm10 ?? '—'} µg/m³
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Ozone (O₃)</dt>
                <dd className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {current?.pollutants.ozone ?? '—'} µg/m³
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">NO₂</dt>
                <dd className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {current?.pollutants.nitrogenDioxide ?? '—'} µg/m³
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {aqiStandard === 'eu' ? 'European AQI Legend' : 'US EPA AQI Legend'}
            </h3>
            <ul className="mt-2.5 space-y-1.5 text-xs">
              {legend.map((item) => (
                <li key={item.key} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.hexColor }}
                      aria-hidden="true"
                    />
                    <span aria-hidden="true" className="font-mono text-[10px]">
                      {item.symbol}
                    </span>
                    <span>{item.shortLabel}</span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {item.rangeLabel}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Radius overlay (~6 km) represents gridded atmospheric model coverage from Open-Meteo for the selected coordinate. No synthetic ground stations are displayed.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
