export function AboutSourcesView() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          About AirWise AI & Data Sources
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          AirWise AI (Challenge 6 – Urban Air Quality Assistant) combines real-time atmospheric model feeds, meteorological data, deterministic health guidance rules, and server-side Gemini AI &amp; Hugging Face Inference Providers to help urban residents make safer daily outdoor decisions.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Environmental & Location APIs
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                Open-Meteo Air Quality API
              </dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                Provides current estimates and 24-hour hourly forecasts for US EPA AQI, European AQI, PM2.5, PM10, O₃, NO₂, SO₂, and CO powered by Copernicus CAMS atmospheric models.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                Open-Meteo Weather API
              </dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                Supplies current 2-meter temperature, relative humidity, 10-meter wind speed, and WMO weather conditions to contextualize pollutant dispersion.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                Open-Meteo Geocoding & OpenStreetMap
              </dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                Powers debounced city search, interactive Leaflet map tiles (&copy; OpenStreetMap contributors), and reverse coordinate lookup.
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Decision Architecture & Limitations
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                Dual-Layer Guidance Engine
              </dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                Safety-critical recommendations never depend solely on AI availability. A deterministic TypeScript rule matrix runs locally, while the server-side AI Health Assistant answers natural-language questions via Gemini AI or Hugging Face Inference Providers grounded strictly in live telemetry.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                Measurement vs. Model Forecast Distinction
              </dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                Open-Meteo provides gridded atmospheric model outputs rather than hyper-local curbside sensor probes. Forecast charts represent predictive hourly trajectories and are explicitly labeled as forecasts.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 dark:text-slate-100">
                Medical Disclaimer
              </dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                AirWise AI provides informational environmental guidance only. It does not diagnose medical conditions, guarantee personal safety, or replace advice from a qualified healthcare professional.
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
