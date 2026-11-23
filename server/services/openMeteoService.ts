import type { AirQualityDataset, HourlyForecastPoint, LocationInfo } from '../../src/types/airQuality.ts';
import {
  describeWmoWeatherCode,
  sanitizeAqiValue,
  sanitizePollutantValue,
} from '../../src/utils/aqi.ts';
import { TtlCache } from '../utils/cache.ts';

const REQUEST_TIMEOUT_MS = 8000;
const airQualityCache = new TtlCache<AirQualityDataset>(10 * 60 * 1000, 200);
const geocodeCache = new TtlCache<LocationInfo[]>(30 * 60 * 1000, 200);

interface OpenMeteoAirQualityRaw {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  elevation?: number;
  current?: {
    time?: string;
    us_aqi?: number | null;
    european_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    carbon_monoxide?: number | null;
    nitrogen_dioxide?: number | null;
    sulphur_dioxide?: number | null;
    ozone?: number | null;
  };
  hourly?: {
    time?: string[];
    us_aqi?: (number | null)[];
    european_aqi?: (number | null)[];
    pm2_5?: (number | null)[];
    pm10?: (number | null)[];
    ozone?: (number | null)[];
    nitrogen_dioxide?: (number | null)[];
  };
}

interface OpenMeteoWeatherRaw {
  current?: {
    time?: string;
    temperature_2m?: number | null;
    relative_humidity_2m?: number | null;
    wind_speed_10m?: number | null;
    weather_code?: number | null;
  };
}

interface OpenMeteoGeocodingRaw {
  results?: {
    id?: number;
    name?: string;
    admin1?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  }[];
}

export class UpstreamApiError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'UpstreamApiError';
    this.statusCode = statusCode;
  }
}

function build24HourForecast(
  hourly: OpenMeteoAirQualityRaw['hourly'],
  currentTimeIso: string | null
): HourlyForecastPoint[] {
  const times = hourly?.time;
  if (!Array.isArray(times) || times.length === 0) {
    return [];
  }

  let startIndex = 0;
  if (currentTimeIso) {
    const currentMs = new Date(currentTimeIso).getTime();
    if (!Number.isNaN(currentMs)) {
      const idx = times.findIndex((t) => new Date(t).getTime() >= currentMs);
      if (idx >= 0) {
        startIndex = idx;
      }
    }
  }

  const sliceEnd = Math.min(times.length, startIndex + 24);
  const points: HourlyForecastPoint[] = [];

  for (let i = startIndex; i < sliceEnd; i += 1) {
    points.push({
      time: times[i],
      usAqi: sanitizeAqiValue(hourly?.us_aqi?.[i]),
      europeanAqi: sanitizeAqiValue(hourly?.european_aqi?.[i]),
      pm2_5: sanitizePollutantValue(hourly?.pm2_5?.[i]),
      pm10: sanitizePollutantValue(hourly?.pm10?.[i]),
      ozone: sanitizePollutantValue(hourly?.ozone?.[i]),
      nitrogenDioxide: sanitizePollutantValue(hourly?.nitrogen_dioxide?.[i]),
    });
  }

  return points;
}

export async function fetchAirQualityAndWeather(
  latitude: number,
  longitude: number
): Promise<AirQualityDataset> {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = airQualityCache.get(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const aqParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current:
      'us_aqi,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
    hourly: 'us_aqi,european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide',
    timezone: 'auto',
    forecast_days: '2',
  });

  const weatherParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    timezone: 'auto',
  });

  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${aqParams.toString()}`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?${weatherParams.toString()}`;

  let aqResponse: Response;
  let weatherResponse: Response | null = null;

  try {
    const [aqRes, wRes] = await Promise.allSettled([
      fetch(aqUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
      fetch(weatherUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
    ]);

    if (aqRes.status === 'rejected') {
      throw new UpstreamApiError('Air quality service timed out or could not be reached.', 504);
    }
    aqResponse = aqRes.value;
    if (wRes.status === 'fulfilled' && wRes.value.ok) {
      weatherResponse = wRes.value;
    }
  } catch (error) {
    if (error instanceof UpstreamApiError) throw error;
    throw new UpstreamApiError('Unable to reach Open-Meteo environmental services.', 502);
  }

  if (!aqResponse.ok) {
    throw new UpstreamApiError(
      `Open-Meteo Air Quality API returned status ${aqResponse.status}.`,
      502
    );
  }

  const aqJson = (await aqResponse.json()) as OpenMeteoAirQualityRaw;
  if (!aqJson || !aqJson.current) {
    throw new UpstreamApiError('Open-Meteo returned an incomplete air quality payload.', 502);
  }

  let weatherJson: OpenMeteoWeatherRaw | null = null;
  if (weatherResponse) {
    try {
      weatherJson = (await weatherResponse.json()) as OpenMeteoWeatherRaw;
    } catch {
      weatherJson = null;
    }
  }

  const observedAt = aqJson.current.time ?? null;
  const weatherCode =
    typeof weatherJson?.current?.weather_code === 'number'
      ? weatherJson.current.weather_code
      : null;

  const dataset: AirQualityDataset = {
    location: {
      latitude: typeof aqJson.latitude === 'number' ? aqJson.latitude : latitude,
      longitude: typeof aqJson.longitude === 'number' ? aqJson.longitude : longitude,
      timezone: typeof aqJson.timezone === 'string' ? aqJson.timezone : 'UTC',
      elevationMeters: typeof aqJson.elevation === 'number' ? aqJson.elevation : null,
    },
    current: {
      usAqi: sanitizeAqiValue(aqJson.current.us_aqi),
      europeanAqi: sanitizeAqiValue(aqJson.current.european_aqi),
      pollutants: {
        pm2_5: sanitizePollutantValue(aqJson.current.pm2_5),
        pm10: sanitizePollutantValue(aqJson.current.pm10),
        ozone: sanitizePollutantValue(aqJson.current.ozone),
        nitrogenDioxide: sanitizePollutantValue(aqJson.current.nitrogen_dioxide),
        sulfurDioxide: sanitizePollutantValue(aqJson.current.sulphur_dioxide),
        carbonMonoxide: sanitizePollutantValue(aqJson.current.carbon_monoxide, 200000),
      },
      weather: {
        temperatureC:
          typeof weatherJson?.current?.temperature_2m === 'number'
            ? Math.round(weatherJson.current.temperature_2m * 10) / 10
            : null,
        humidityPercent:
          typeof weatherJson?.current?.relative_humidity_2m === 'number'
            ? Math.round(weatherJson.current.relative_humidity_2m)
            : null,
        windSpeedKmh:
          typeof weatherJson?.current?.wind_speed_10m === 'number'
            ? Math.round(weatherJson.current.wind_speed_10m * 10) / 10
            : null,
        weatherCode,
        weatherLabel: describeWmoWeatherCode(weatherCode),
      },
      observedAt,
    },
    hourlyForecast: build24HourForecast(aqJson.hourly, observedAt),
    fetchedAt: new Date().toISOString(),
    cached: false,
    attribution: {
      airQuality: 'Open-Meteo Air Quality API (CAMS Copernicus Atmospheric Monitoring)',
      weather: 'Open-Meteo Weather Forecast API',
      note: 'Current readings reflect gridded atmospheric model estimates for the selected coordinates; hourly forecast values are predictive model outputs.',
    },
  };

  airQualityCache.set(cacheKey, dataset);
  return dataset;
}

export async function searchLocations(query: string): Promise<LocationInfo[]> {
  const normalized = query.trim().toLowerCase();
  const cached = geocodeCache.get(normalized);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    name: query.trim(),
    count: '8',
    language: 'en',
    format: 'json',
  });

  let response: Response;
  try {
    response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new UpstreamApiError('Location search service timed out.', 504);
  }

  if (!response.ok) {
    throw new UpstreamApiError(`Geocoding API returned status ${response.status}.`, 502);
  }

  const data = (await response.json()) as OpenMeteoGeocodingRaw;
  const results: LocationInfo[] = (data.results ?? [])
    .filter(
      (item): item is Required<Pick<typeof item, 'name' | 'latitude' | 'longitude'>> & typeof item =>
        typeof item.name === 'string' &&
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number'
    )
    .map((item) => ({
      id: `geo-${item.id ?? `${item.latitude.toFixed(3)}-${item.longitude.toFixed(3)}`}`,
      name: item.name,
      region: item.admin1,
      country: item.country,
      latitude: Math.round(item.latitude * 10000) / 10000,
      longitude: Math.round(item.longitude * 10000) / 10000,
      timezone: item.timezone,
      source: 'search',
    }));

  geocodeCache.set(normalized, results);
  return results;
}

export async function reverseLookupLocation(
  latitude: number,
  longitude: number
): Promise<{ name: string; region?: string; country?: string }> {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: 'jsonv2',
      zoom: '10',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      signal: AbortSignal.timeout(4000),
      headers: {
        'User-Agent': 'AirWiseAI/1.0 (urban-air-quality-assistant)',
        'Accept-Language': 'en',
      },
    });
    if (!res.ok) {
      return { name: `Coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})` };
    }
    const json = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        country?: string;
      };
      name?: string;
    };
    const addr = json.address;
    const cityName =
      addr?.city ||
      addr?.town ||
      addr?.village ||
      addr?.county ||
      json.name ||
      `Coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;

    return {
      name: cityName,
      region: addr?.state,
      country: addr?.country,
    };
  } catch {
    return { name: `Coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})` };
  }
}

export function clearServerCaches(): void {
  airQualityCache.clear();
  geocodeCache.clear();
}
