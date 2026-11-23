# AirWise AI – Urban Air Quality Intelligence Assistant

**Challenge 6 – Urban Air Quality Assistant**

AirWise AI is a full-stack urban environmental intelligence web application that translates live air quality readings, criteria pollutant concentrations, weather conditions, and 24-hour pollution forecasts into clear, context-aware daily health decisions.

---

## 1. Problem Statement

Urban residents often face opaque Air Quality Index numbers without practical answers to everyday questions: *Is it safe to run outdoors right now? Should children play outside? Will pollution worsen later today? Should I wear an N95 respirator?* Existing tools frequently either show raw numbers without personalized context, rely exclusively on an LLM without deterministic safety fallbacks, or fail silently when location permissions or external APIs are unavailable.

## 2. Project Objectives

- Monitor live **US EPA AQI (0–500)** and **European AQI (0–100+)** alongside six criteria pollutants (`PM2.5`, `PM10`, `O₃`, `NO₂`, `SO₂`, `CO`) and local weather telemetry.
- Provide resilient **location intelligence** via browser geolocation, debounced city search, manual coordinate entry, interactive map selection, recent history, and a reliable default fallback (`Bengaluru: 12.97° N, 77.59° E`).
- Deliver transparent, deterministic **personalized recommendations** for five sensitivity profiles and five activity types even when AI services are unavailable.
- Offer a **Gemini-powered AI Health Assistant** returning structured, medically cautious, data-grounded answers.
- Visualize **24-hour predictive forecasts** cleanly with Recharts while strictly distinguishing predictive model outputs from current conditions.

## 3. Key Features

- **Dashboard**: Primary SVG AQI gauge (with US EPA / European AQI toggle), plain-English interpretation, current weather strip, 6 pollutant cards with WHO benchmark comparisons, and personalized guidance.
- **Live Air Quality Telemetry**: Detailed pollutant breakdown table with health mechanisms, WHO 24-hour/8-hour guidelines, and meteorological wind dispersion analysis.
- **Interactive Air Quality Map**: OpenStreetMap via Leaflet featuring an AQI marker, 6 km atmospheric grid radius overlay, click-to-relocate coordinate inspection, and full AQI category legend without fabricated monitoring stations.
- **Forecast & Trends**: Responsive Recharts visualizations for the next 24 hours of projected AQI, PM2.5, and PM10 levels.
- **AI Health Assistant**: Server-side multi-provider AI integration (`Gemini AI` with automatic `Hugging Face Inference Providers` failover, or direct provider selection) returning a 6-part structured response (`Short Answer`, `Current Environmental Conditions`, `Risk Explanation`, `Recommended Precautions`, `Outdoor Activity Guidance`, `Important Limitations`) with automatic deterministic rule-based fallback.
- **Smart Alerts**: Configurable US AQI, PM2.5, and 24-hour spike thresholds with in-app warnings and opt-in browser notifications while the app is open.
- **Light & Dark Theme**: Clean light theme by default with an accessible dark mode toggle.

## 4. Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts, Leaflet (OpenStreetMap)
- **Backend**: Node.js, Express 4, TypeScript, Zod, `@google/genai` SDK
- **Testing**: Vitest, React Testing Library, `@testing-library/jest-dom`, Supertest, jsdom

## 5. Application Architecture

```text
Browser (React 19 + Tailwind v4 + Recharts + Leaflet)
  ├── AppContext (Location, Theme, AQI Standard, Profile, Alerts, AI Chat)
  ├── Deterministic Recommendation & Alert Engines (Always available offline)
  └── Typed API Client (In-memory TTL Cache + AbortController)
         │
         ▼ HTTPS (/api/*)
Express Backend (server.ts -> server/app.ts)
  ├── Security Middleware (64 KB limit, headers, per-IP rate limiting)
  ├── Zod Validation & Prompt-Injection Guard
  ├── Open-Meteo Proxy + Bounded TTL Cache (Air Quality, Weather, Geocoding)
  └── AI Health Assistant Services (Gemini @google/genai + Hugging Face Router, server-only keys)
```

### How the Application Works

1. On startup, `AppContext` loads Bengaluru (`12.9716, 77.5946`) immediately so the dashboard never stalls waiting for permissions. Users can trigger browser geolocation, search any city, enter coordinates, or click the interactive map.
2. Client requests hit `/api/air-quality?lat=...&lon=...`. The Express backend checks its bounded 10-minute TTL cache and, on miss, fetches Open-Meteo Air Quality and Weather APIs in parallel with an 8-second timeout.
3. The client evaluates the deterministic recommendation engine (`src/utils/recommendations.ts`) and smart alert rules (`src/utils/alerts.ts`) synchronously.
4. When the user asks a natural-language question in the **AI Health Assistant**, `/api/ai/health-assistant` validates the payload, checks for prompt-injection patterns, and queries Gemini using `process.env.GEMINI_MODEL` (defaulting to `gemini-4-hydrogen`) or Hugging Face Inference Providers (`https://router.huggingface.co/v1/chat/completions`) based on the selected provider (`auto`, `gemini`, or `huggingface`). In `auto` mode, if Gemini fails and `HUGGINGFACE_API_KEY` / `HF_TOKEN` is configured, it automatically fails over to Hugging Face; if all AI providers are unavailable, the UI transparently switches to the 6-part rule-based fallback.

## 6. AI Integration & Decision-Making Logic

- **Models & Failover**: Gemini (`GEMINI_MODEL`, default `gemini-4-hydrogen`) via `@google/genai`, and Hugging Face Inference Providers (`HUGGINGFACE_MODEL`, default `Qwen/Qwen3.5-9B` with automatic model fallback) via `https://router.huggingface.co/v1/chat/completions`. Failover chain in `auto` mode: `Gemini -> Hugging Face -> Deterministic Rule Engine`.
- **Structured Output**: Uses `responseMimeType: "application/json"` and `responseSchema` (`Type.OBJECT`) to guarantee the 6-section advisory format.
- **Clinical & Factual Guardrails**: System instructions forbid diagnosing medical conditions, inventing AQI measurements, claiming guaranteed personal safety, or overriding safety boundaries via user-supplied text.
- **Rule-Based Safety Matrix**: Computes effective risk across 5 sensitivity profiles (`general`, `child`, `senior`, `sensitive`, `athlete`) and 5 exertion levels (`general`, `walking`, `cycling`, `sports`, `running`) independently of AI availability.

## 7. API Integrations

- **Open-Meteo Air Quality API**: `https://air-quality-api.open-meteo.com/v1/air-quality` (`us_aqi`, `european_aqi`, `pm2_5`, `pm10`, `carbon_monoxide`, `nitrogen_dioxide`, `sulfur_dioxide`, `ozone`, 24h hourly forecast)
- **Open-Meteo Weather API**: `https://api.open-meteo.com/v1/forecast` (`temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`, `weather_code`)
- **Open-Meteo Geocoding API**: `https://geocoding-api.open-meteo.com/v1/search`
- **OpenStreetMap Nominatim & Tiles**: Reverse coordinate lookup and Leaflet basemap tiles

## 8. Security Implementation

- **Server-Only Secrets**: `GEMINI_API_KEY` and `HUGGINGFACE_API_KEY` (`HF_TOKEN`) are accessed strictly in server-side `process.env` and never bundled or sent to the browser.
- **Input Validation**: All API endpoints validate coordinates, search strings, and AI payloads with `zod`.
- **Rate Limiting & Payload Caps**: Express enforces a `64kb` JSON limit and sliding-window per-IP rate limiting (15 req/min on AI routes, 90 req/min on data routes).
- **Prompt Injection Defense**: Detects instruction-override patterns and isolates sanitized user text inside `<untrusted_user_question>` delimiters.
- **Safe Error Handling**: Upstream failures return structured error codes without exposing stack traces or credentials.

## 9. Performance Optimization

- Dual-layer caching (10-minute bounded LRU/TTL cache on the Express proxy + 5-minute client cache).
- Debounced city search (`350ms`) with `AbortController` request cancellation to prevent stale race conditions.
- Lazy-loaded (`React.lazy` + `Suspense`) Map and Forecast views to keep initial bundle load fast.

## 10. Accessibility Implementation (WCAG 2.2 AA)

- Semantic landmarks (`<header>`, `<aside>`, `<nav>`, `<main>`, `<section>`), skip-to-content link, and accessible form labels.
- **Non-hue-only state signaling**: Every AQI category combines color with explicit text labels and symbols (`✓`, `•`, `▲`, `!`, `◆`, `✖`).
- Keyboard-accessible controls with `focus-visible` outlines, tabular numerals (`tabular-nums`), ARIA chart descriptions, and `prefers-reduced-motion` support.

## 11. Testing Methodology

Run the full automated suite:

```bash
npm test
```

The test suite covers:
- **Unit Tests** (`tests/unit/`): US/EU AQI categorization, pollutant sanitization, deterministic recommendation engine, smart alert evaluation, Zod validation, and prompt-injection detection.
- **Integration Tests** (`tests/integration/`): Supertest verification of Express endpoints, mocked Open-Meteo air quality/weather/geocoding responses, error handling, and Gemini AI schema output.
- **Frontend Tests** (`tests/frontend/`): React Testing Library tests for dashboard rendering, loading/error states, AQI scale switching, sensitivity profiles, and debounced city search.

## 12. Installation & Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment variables**:
   Copy `.env.example` to `.env` and set your `GEMINI_API_KEY`:
   ```bash
   cp .env.example .env
   ```
   Variables:
   - `GEMINI_API_KEY`: Google Gemini API key (server-side only; optional—rule-based fallback operates without it).
   - `GEMINI_MODEL`: Optional Gemini model override (defaults to `gemini-4-hydrogen`).
   - `HUGGINGFACE_API_KEY` (or `HF_TOKEN`): Hugging Face API token for Inference Providers (server-side only; optional).
   - `HUGGINGFACE_MODEL`: Optional Hugging Face chat model override (defaults to `Qwen/Qwen3.5-9B`).
   - `PORT`: Server port (defaults to `3000`).
3. **Run development server**:
   ```bash
   npm run dev
   ```
4. **Type-check, test, and build for production**:
   ```bash
   npm run lint
   npm test
   npm run build
   NODE_ENV=production npm start
   ```

## 13. Assumptions & Limitations

- Open-Meteo supplies gridded atmospheric model estimates rather than hyper-local street-level sensor readings. Micro-environments near highways, construction dust, or indoor cooking sources may differ.
- Browser smart notifications evaluate only while AirWise AI is open in an active browser session.
- AirWise AI is an informational decision-support tool and does not replace professional medical advice or emergency services.

## 14. Data Sources & Attribution

- Air quality & weather data: [Open-Meteo](https://open-meteo.com/) (Copernicus Atmosphere Monitoring Service / CAMS).
- Map tiles & reverse geocoding: [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors via Leaflet.
- Conversational health explanations: Google Gemini API (`@google/genai`) &amp; Hugging Face Inference Providers.
