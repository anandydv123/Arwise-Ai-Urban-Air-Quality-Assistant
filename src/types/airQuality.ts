export type AqiStandard = 'us' | 'eu';

export type AqiCategoryKey =
  | 'good'
  | 'moderate'
  | 'sensitive'
  | 'unhealthy'
  | 'very_unhealthy'
  | 'hazardous'
  | 'unavailable';

export type SensitivityGroup =
  | 'general'
  | 'child'
  | 'senior'
  | 'sensitive'
  | 'athlete';

export type ActivityType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'sports'
  | 'general';

export type LocationSource =
  | 'geolocation'
  | 'search'
  | 'coordinates'
  | 'map'
  | 'default';

export interface LocationInfo {
  id: string;
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  source: LocationSource;
}

export interface PollutantReadings {
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogenDioxide: number | null;
  sulfurDioxide: number | null;
  carbonMonoxide: number | null;
}

export interface WeatherReadings {
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  weatherCode: number | null;
  weatherLabel: string;
}

export interface CurrentAirQualitySnapshot {
  usAqi: number | null;
  europeanAqi: number | null;
  pollutants: PollutantReadings;
  weather: WeatherReadings;
  observedAt: string | null;
}

export interface HourlyForecastPoint {
  time: string;
  usAqi: number | null;
  europeanAqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogenDioxide: number | null;
}

export interface AirQualityDataset {
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
    elevationMeters: number | null;
  };
  current: CurrentAirQualitySnapshot;
  hourlyForecast: HourlyForecastPoint[];
  fetchedAt: string;
  cached: boolean;
  attribution: {
    airQuality: string;
    weather: string;
    note: string;
  };
}

export interface AqiCategoryDescriptor {
  key: AqiCategoryKey;
  label: string;
  shortLabel: string;
  rangeLabel: string;
  summary: string;
  hexColor: string;
  badgeBgClass: string;
  badgeTextClass: string;
  borderClass: string;
  dotClass: string;
  symbol: string;
}

export interface RecommendationResult {
  safetyLevel: 'Safe' | 'Caution' | 'Limit Exposure' | 'Avoid Outdoors' | 'Unavailable';
  headline: string;
  summary: string;
  precautions: string[];
  bestWindowHint: string;
  maskGuidance: string;
  dominantPollutant: string | null;
  reasoningFactors: string[];
  limitations: string;
}

export interface StructuredHealthAdvice {
  shortAnswer: string;
  currentConditions: string;
  riskExplanation: string;
  precautions: string[];
  activityGuidance: string;
  limitations: string;
}

export type AiProviderPreference = 'auto' | 'gemini' | 'huggingface';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  structured?: StructuredHealthAdvice;
  source?: 'gemini' | 'huggingface' | 'rule-engine';
  model?: string;
  error?: string;
  createdAt: string;
}

export interface AlertThresholds {
  usAqiThreshold: number;
  pm25Threshold: number;
  spikeDeltaThreshold: number;
  browserNotificationsEnabled: boolean;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface SmartAlertItem {
  id: string;
  type: 'high_aqi' | 'unhealthy_air' | 'sensitive_group' | 'pollution_spike' | 'pm25_high';
  severity: AlertSeverity;
  title: string;
  message: string;
  metricValue: string;
  triggeredAt: string;
}

export type AppSection =
  | 'dashboard'
  | 'live'
  | 'map'
  | 'forecast'
  | 'assistant'
  | 'alerts'
  | 'about';
