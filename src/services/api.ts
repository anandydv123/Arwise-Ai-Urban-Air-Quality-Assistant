import type {
  ActivityType,
  AiProviderPreference,
  AirQualityDataset,
  LocationInfo,
  SensitivityGroup,
  StructuredHealthAdvice,
} from '../types/airQuality.ts';

interface ClientCacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CLIENT_AQ_TTL_MS = 5 * 60 * 1000;
const aqClientCache = new Map<string, ClientCacheEntry<AirQualityDataset>>();

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

async function parseErrorResponse(res: Response): Promise<ApiClientError> {
  try {
    const body = (await res.json()) as { error?: string; code?: string };
    return new ApiClientError(
      body.error || `Request failed with status ${res.status}`,
      res.status,
      body.code
    );
  } catch {
    return new ApiClientError(`Request failed with status ${res.status}`, res.status);
  }
}

export async function fetchAirQualityData(
  latitude: number,
  longitude: number,
  options?: { signal?: AbortSignal; forceRefresh?: boolean }
): Promise<AirQualityDataset> {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  if (!options?.forceRefresh) {
    const cached = aqClientCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  const params = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
  });

  const res = await fetch(`/api/air-quality?${params.toString()}`, {
    signal: options?.signal,
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const data = (await res.json()) as AirQualityDataset;
  aqClientCache.set(key, {
    data,
    expiresAt: Date.now() + CLIENT_AQ_TTL_MS,
  });
  return data;
}

export async function searchCitiesApi(
  query: string,
  signal?: AbortSignal
): Promise<LocationInfo[]> {
  const params = new URLSearchParams({ q: query.trim() });
  const res = await fetch(`/api/locations/search?${params.toString()}`, { signal });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const body = (await res.json()) as { results: LocationInfo[] };
  return body.results ?? [];
}

export async function reverseLookupApi(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<{ name: string; region?: string; country?: string }> {
  const params = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
  });
  const res = await fetch(`/api/locations/reverse?${params.toString()}`, { signal });
  if (!res.ok) {
    return { name: `Coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})` };
  }
  return (await res.json()) as { name: string; region?: string; country?: string };
}

export interface AiAssistantApiInput {
  question: string;
  locationName: string;
  sensitivityGroup: SensitivityGroup;
  activity: ActivityType;
  provider?: AiProviderPreference;
  history: { role: 'user' | 'assistant'; text: string }[];
  dataset: AirQualityDataset | null;
}

export async function queryAiHealthAssistant(
  input: AiAssistantApiInput,
  signal?: AbortSignal
): Promise<{
  advice: StructuredHealthAdvice;
  model: string;
  source: 'gemini' | 'huggingface';
}> {
  const dataset = input.dataset;
  let next24hSummary:
    | { minUsAqi: number | null; maxUsAqi: number | null; peakTime: string | null }
    | undefined;

  if (dataset && dataset.hourlyForecast.length > 0) {
    const valid = dataset.hourlyForecast.filter(
      (h): h is typeof h & { usAqi: number } => typeof h.usAqi === 'number'
    );
    if (valid.length > 0) {
      let min = valid[0].usAqi;
      let max = valid[0];
      for (const h of valid) {
        if (h.usAqi < min) min = h.usAqi;
        if (h.usAqi > max.usAqi) max = h;
      }
      next24hSummary = {
        minUsAqi: min,
        maxUsAqi: max.usAqi,
        peakTime: max.time,
      };
    }
  }

  const res = await fetch('/api/ai/health-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      question: input.question,
      locationName: input.locationName,
      sensitivityGroup: input.sensitivityGroup,
      activity: input.activity,
      provider: input.provider ?? 'auto',
      history: input.history.slice(-6),
      environmentalContext: dataset
        ? {
            usAqi: dataset.current.usAqi,
            europeanAqi: dataset.current.europeanAqi,
            observedAt: dataset.current.observedAt,
            pollutants: dataset.current.pollutants,
            weather: {
              temperatureC: dataset.current.weather.temperatureC,
              humidityPercent: dataset.current.weather.humidityPercent,
              windSpeedKmh: dataset.current.weather.windSpeedKmh,
              weatherLabel: dataset.current.weather.weatherLabel,
            },
            next24hSummary,
          }
        : null,
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return (await res.json()) as {
    advice: StructuredHealthAdvice;
    model: string;
    source: 'gemini' | 'huggingface';
  };
}

export function clearClientApiCache(): void {
  aqClientCache.clear();
}
