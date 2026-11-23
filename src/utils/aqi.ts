import type {
  AqiCategoryDescriptor,
  AqiCategoryKey,
  AqiStandard,
  LocationInfo,
  PollutantReadings,
} from '../types/airQuality.ts';

export const DEFAULT_FALLBACK_LOCATION: LocationInfo = {
  id: 'default-bengaluru',
  name: 'Bengaluru',
  region: 'Karnataka',
  country: 'India',
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: 'Asia/Kolkata',
  source: 'default',
};

export const US_AQI_LEGEND: AqiCategoryDescriptor[] = [
  {
    key: 'good',
    label: 'Good',
    shortLabel: 'Good',
    rangeLabel: '0–50',
    summary: 'Air quality is satisfactory, and air pollution poses little or no risk.',
    hexColor: '#16A34A',
    badgeBgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    badgeTextClass: 'text-emerald-800 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    dotClass: 'bg-emerald-600',
    symbol: '✓',
  },
  {
    key: 'moderate',
    label: 'Moderate',
    shortLabel: 'Moderate',
    rangeLabel: '51–100',
    summary: 'Air quality is acceptable, though unusually sensitive individuals may experience mild symptoms.',
    hexColor: '#CA8A04',
    badgeBgClass: 'bg-yellow-50 dark:bg-yellow-950/50',
    badgeTextClass: 'text-yellow-800 dark:text-yellow-300',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
    dotClass: 'bg-yellow-500',
    symbol: '•',
  },
  {
    key: 'sensitive',
    label: 'Unhealthy for Sensitive Groups',
    shortLabel: 'Sensitive Groups',
    rangeLabel: '101–150',
    summary: 'Children, older adults, and people with respiratory or heart conditions may experience health effects.',
    hexColor: '#EA580C',
    badgeBgClass: 'bg-orange-50 dark:bg-orange-950/50',
    badgeTextClass: 'text-orange-800 dark:text-orange-300',
    borderClass: 'border-orange-200 dark:border-orange-800',
    dotClass: 'bg-orange-600',
    symbol: '▲',
  },
  {
    key: 'unhealthy',
    label: 'Unhealthy',
    shortLabel: 'Unhealthy',
    rangeLabel: '151–200',
    summary: 'Everyone may begin to experience health effects; sensitive groups face more serious irritation.',
    hexColor: '#DC2626',
    badgeBgClass: 'bg-red-50 dark:bg-red-950/50',
    badgeTextClass: 'text-red-800 dark:text-red-300',
    borderClass: 'border-red-200 dark:border-red-800',
    dotClass: 'bg-red-600',
    symbol: '!',
  },
  {
    key: 'very_unhealthy',
    label: 'Very Unhealthy',
    shortLabel: 'Very Unhealthy',
    rangeLabel: '201–300',
    summary: 'Health alert: everyone faces increased likelihood of respiratory or cardiovascular symptoms.',
    hexColor: '#9333EA',
    badgeBgClass: 'bg-purple-50 dark:bg-purple-950/50',
    badgeTextClass: 'text-purple-800 dark:text-purple-300',
    borderClass: 'border-purple-200 dark:border-purple-800',
    dotClass: 'bg-purple-600',
    symbol: '◆',
  },
  {
    key: 'hazardous',
    label: 'Hazardous',
    shortLabel: 'Hazardous',
    rangeLabel: '301–500+',
    summary: 'Health warning of emergency conditions: the entire population is likely to be affected.',
    hexColor: '#7F1D1D',
    badgeBgClass: 'bg-rose-100 dark:bg-rose-950/70',
    badgeTextClass: 'text-rose-900 dark:text-rose-200',
    borderClass: 'border-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-900',
    symbol: '✖',
  },
];

export const EU_AQI_LEGEND: AqiCategoryDescriptor[] = [
  {
    ...US_AQI_LEGEND[0],
    rangeLabel: '0–20',
  },
  {
    ...US_AQI_LEGEND[1],
    label: 'Fair',
    shortLabel: 'Fair',
    rangeLabel: '21–40',
  },
  {
    ...US_AQI_LEGEND[2],
    label: 'Moderate',
    shortLabel: 'Moderate',
    rangeLabel: '41–60',
  },
  {
    ...US_AQI_LEGEND[3],
    label: 'Poor',
    shortLabel: 'Poor',
    rangeLabel: '61–80',
  },
  {
    ...US_AQI_LEGEND[4],
    label: 'Very Poor',
    shortLabel: 'Very Poor',
    rangeLabel: '81–100',
  },
  {
    ...US_AQI_LEGEND[5],
    label: 'Extremely Poor',
    shortLabel: 'Extremely Poor',
    rangeLabel: '>100',
  },
];

export const UNAVAILABLE_CATEGORY: AqiCategoryDescriptor = {
  key: 'unavailable',
  label: 'Data Unavailable',
  shortLabel: 'Unavailable',
  rangeLabel: '—',
  summary: 'Live AQI measurement is currently unavailable for this location.',
  hexColor: '#64748B',
  badgeBgClass: 'bg-slate-100 dark:bg-slate-800',
  badgeTextClass: 'text-slate-700 dark:text-slate-300',
  borderClass: 'border-slate-300 dark:border-slate-700',
  dotClass: 'bg-slate-500',
  symbol: '?',
};

export function classifyUsAqi(value: number | null | undefined): AqiCategoryDescriptor {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return UNAVAILABLE_CATEGORY;
  }
  if (value <= 50) return US_AQI_LEGEND[0];
  if (value <= 100) return US_AQI_LEGEND[1];
  if (value <= 150) return US_AQI_LEGEND[2];
  if (value <= 200) return US_AQI_LEGEND[3];
  if (value <= 300) return US_AQI_LEGEND[4];
  return US_AQI_LEGEND[5];
}

export function classifyEuropeanAqi(value: number | null | undefined): AqiCategoryDescriptor {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return UNAVAILABLE_CATEGORY;
  }
  if (value <= 20) return EU_AQI_LEGEND[0];
  if (value <= 40) return EU_AQI_LEGEND[1];
  if (value <= 60) return EU_AQI_LEGEND[2];
  if (value <= 80) return EU_AQI_LEGEND[3];
  if (value <= 100) return EU_AQI_LEGEND[4];
  return EU_AQI_LEGEND[5];
}

export function classifyAqi(
  value: number | null | undefined,
  standard: AqiStandard
): AqiCategoryDescriptor {
  return standard === 'eu' ? classifyEuropeanAqi(value) : classifyUsAqi(value);
}

export function getCategoryLegend(standard: AqiStandard): AqiCategoryDescriptor[] {
  return standard === 'eu' ? EU_AQI_LEGEND : US_AQI_LEGEND;
}

export function sanitizePollutantValue(value: unknown, maxBound = 50000): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > maxBound) {
    return null;
  }
  return Math.round(value * 10) / 10;
}

export function sanitizeAqiValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000) {
    return null;
  }
  return Math.round(value);
}

export interface PollutantDefinition {
  key: keyof PollutantReadings;
  code: string;
  name: string;
  unit: string;
  who24hGuideline: number;
  whoUnitNote: string;
  description: string;
  healthEffect: string;
}

export const POLLUTANT_DEFINITIONS: PollutantDefinition[] = [
  {
    key: 'pm2_5',
    code: 'PM2.5',
    name: 'Fine Particulate Matter',
    unit: 'µg/m³',
    who24hGuideline: 15,
    whoUnitNote: 'WHO 24h guideline: 15 µg/m³',
    description: 'Inhalable airborne particles 2.5 micrometers or smaller from combustion, traffic, and smoke.',
    healthEffect: 'Penetrates deep into lung alveoli and can enter the bloodstream.',
  },
  {
    key: 'pm10',
    code: 'PM10',
    name: 'Coarse Particulate Matter',
    unit: 'µg/m³',
    who24hGuideline: 45,
    whoUnitNote: 'WHO 24h guideline: 45 µg/m³',
    description: 'Coarser inhalable dust, road resuspension, pollen fragments, and construction particles.',
    healthEffect: 'Irritates upper airways, eyes, and bronchial passages.',
  },
  {
    key: 'ozone',
    code: 'O₃',
    name: 'Ground-Level Ozone',
    unit: 'µg/m³',
    who24hGuideline: 100,
    whoUnitNote: 'WHO 8h guideline: 100 µg/m³',
    description: 'Secondary pollutant formed when sunlight reacts with nitrogen oxides and volatile organic compounds.',
    healthEffect: 'Can trigger airway inflammation, coughing, and reduced lung capacity during exertion.',
  },
  {
    key: 'nitrogenDioxide',
    code: 'NO₂',
    name: 'Nitrogen Dioxide',
    unit: 'µg/m³',
    who24hGuideline: 25,
    whoUnitNote: 'WHO 24h guideline: 25 µg/m³',
    description: 'Traffic and fossil-fuel combustion gas concentrated near dense urban corridors.',
    healthEffect: 'Heightens bronchial reactivity, especially for asthma and pediatric airways.',
  },
  {
    key: 'sulfurDioxide',
    code: 'SO₂',
    name: 'Sulfur Dioxide',
    unit: 'µg/m³',
    who24hGuideline: 40,
    whoUnitNote: 'WHO 24h guideline: 40 µg/m³',
    description: 'Colorless gas emitted by industrial boilers, power generation, and sulfur-rich fuels.',
    healthEffect: 'Can rapidly constrict airways in people with asthma during outdoor exercise.',
  },
  {
    key: 'carbonMonoxide',
    code: 'CO',
    name: 'Carbon Monoxide',
    unit: 'µg/m³',
    who24hGuideline: 4000,
    whoUnitNote: 'WHO 24h guideline: 4,000 µg/m³',
    description: 'Odorless gas produced by incomplete fuel combustion in vehicles and biomass burning.',
    healthEffect: 'Reduces oxygen delivery in blood at elevated concentrations.',
  },
];

export function evaluatePollutantStatus(
  value: number | null,
  guideline: number
): { label: string; toneClass: string } {
  if (value === null) {
    return { label: 'Unavailable', toneClass: 'text-slate-500 dark:text-slate-400' };
  }
  const ratio = value / guideline;
  if (ratio <= 0.75) {
    return { label: 'Below guideline', toneClass: 'text-emerald-700 dark:text-emerald-400' };
  }
  if (ratio <= 1.25) {
    return { label: 'Near guideline', toneClass: 'text-yellow-700 dark:text-yellow-400' };
  }
  if (ratio <= 2.5) {
    return { label: 'Elevated', toneClass: 'text-orange-700 dark:text-orange-400' };
  }
  return { label: 'High', toneClass: 'text-red-700 dark:text-red-400' };
}

export function identifyDominantPollutant(pollutants: PollutantReadings): string | null {
  let highestRatio = -1;
  let dominant: string | null = null;

  for (const def of POLLUTANT_DEFINITIONS) {
    const val = pollutants[def.key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      const ratio = val / def.who24hGuideline;
      if (ratio > highestRatio) {
        highestRatio = ratio;
        dominant = def.code;
      }
    }
  }

  return dominant;
}

export function describeWmoWeatherCode(code: number | null | undefined): string {
  if (typeof code !== 'number' || !Number.isFinite(code)) {
    return 'Weather unavailable';
  }
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog or mist';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Mixed conditions';
}

export function formatObservedTimestamp(isoString: string | null, timeZone?: string): string {
  if (!isoString) return 'Unavailable';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timeZone || undefined,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function formatHourLabel(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function categorySeverityRank(key: AqiCategoryKey): number {
  switch (key) {
    case 'good':
      return 1;
    case 'moderate':
      return 2;
    case 'sensitive':
      return 3;
    case 'unhealthy':
      return 4;
    case 'very_unhealthy':
      return 5;
    case 'hazardous':
      return 6;
    default:
      return 0;
  }
}
