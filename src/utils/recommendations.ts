import type {
  ActivityType,
  AirQualityDataset,
  AqiCategoryKey,
  RecommendationResult,
  SensitivityGroup,
  StructuredHealthAdvice,
} from '../types/airQuality.ts';
import {
  categorySeverityRank,
  classifyUsAqi,
  formatHourLabel,
  identifyDominantPollutant,
} from './aqi.ts';

export const SENSITIVITY_OPTIONS: { value: SensitivityGroup; label: string; description: string }[] = [
  {
    value: 'general',
    label: 'General adult',
    description: 'Healthy adults with no known respiratory or cardiovascular sensitivities.',
  },
  {
    value: 'child',
    label: 'Child',
    description: 'Developing lungs and higher breathing rate relative to body weight.',
  },
  {
    value: 'senior',
    label: 'Senior citizen',
    description: 'Older adults (65+) with higher sensitivity to fine particulate exposure.',
  },
  {
    value: 'sensitive',
    label: 'Sensitive respiratory group',
    description: 'Individuals managing asthma, COPD, allergies, or cardiovascular sensitivity.',
  },
  {
    value: 'athlete',
    label: 'Outdoor athlete',
    description: 'High-minute-ventilation endurance training increasing total inhaled pollutant dose.',
  },
];

export const ACTIVITY_OPTIONS: { value: ActivityType; label: string; exertion: 'low' | 'moderate' | 'high' }[] = [
  { value: 'general', label: 'General outdoor activities', exertion: 'low' },
  { value: 'walking', label: 'Walking', exertion: 'low' },
  { value: 'cycling', label: 'Cycling', exertion: 'moderate' },
  { value: 'sports', label: 'Outdoor sports', exertion: 'high' },
  { value: 'running', label: 'Running', exertion: 'high' },
];

function findBestForecastWindow(dataset: AirQualityDataset): string {
  const validHours = dataset.hourlyForecast.filter(
    (item): item is typeof item & { usAqi: number } => typeof item.usAqi === 'number'
  );
  if (validHours.length === 0) {
    return 'Forecast window unavailable; check current conditions before heading out.';
  }

  let best = validHours[0];
  for (const hour of validHours) {
    if (hour.usAqi < best.usAqi) {
      best = hour;
    }
  }

  return `Lowest projected 24h US AQI (${best.usAqi}) is expected around ${formatHourLabel(best.time)}.`;
}

export function generateRuleBasedRecommendation(
  dataset: AirQualityDataset | null,
  group: SensitivityGroup,
  activity: ActivityType
): RecommendationResult {
  if (!dataset || dataset.current.usAqi === null) {
    return {
      safetyLevel: 'Unavailable',
      headline: 'Live air quality data is required to generate outdoor guidance.',
      summary:
        'Current AQI measurements are not available for this location. Avoid guessing air safety during hazy conditions or visible smoke.',
      precautions: [
        'Retry loading live telemetry or choose a nearby location.',
        'If air looks hazy or smells smoky, limit vigorous outdoor exertion.',
      ],
      bestWindowHint: 'Forecast window unavailable until live data loads.',
      maskGuidance: 'Keep a well-fitting N95/FFP2 respirator available if local smoke or heavy dust is visible.',
      dominantPollutant: null,
      reasoningFactors: ['Missing current AQI telemetry'],
      limitations:
        'Guidance cannot be reliably computed without active environmental readings. This tool does not provide medical advice.',
    };
  }

  const usAqi = dataset.current.usAqi;
  const category = classifyUsAqi(usAqi);
  const rank = categorySeverityRank(category.key);
  const dominantPollutant = identifyDominantPollutant(dataset.current.pollutants);
  const activityMeta = ACTIVITY_OPTIONS.find((item) => item.value === activity) ?? ACTIVITY_OPTIONS[0];
  const groupMeta = SENSITIVITY_OPTIONS.find((item) => item.value === group) ?? SENSITIVITY_OPTIONS[0];
  const bestWindowHint = findBestForecastWindow(dataset);

  const isVulnerableGroup = group === 'child' || group === 'senior' || group === 'sensitive';
  const isHighExertion = activityMeta.exertion === 'high' || activityMeta.exertion === 'moderate';

  // Compute effective risk shift based on profile sensitivity and exertion
  let effectiveRank = rank;
  if (isVulnerableGroup && rank >= 2) {
    effectiveRank += 1;
  } else if (group === 'athlete' && isHighExertion && rank >= 2) {
    effectiveRank += 1;
  }

  let safetyLevel: RecommendationResult['safetyLevel'] = 'Safe';
  let headline = '';
  let summary = '';
  const precautions: string[] = [];
  let maskGuidance = 'No respirator needed under current conditions for most people.';

  if (effectiveRank <= 1) {
    safetyLevel = 'Safe';
    headline = `Favorable conditions for ${activityMeta.label.toLowerCase()}.`;
    summary = `Current US AQI is ${usAqi} (${category.label}). Air pollution risk is low for ${groupMeta.label.toLowerCase()} profiles.`;
    precautions.push('Stay hydrated and follow routine weather precautions.');
    if (dataset.current.weather.temperatureC !== null && dataset.current.weather.temperatureC >= 32) {
      precautions.push(`Temperature is ${dataset.current.weather.temperatureC}°C—pace outdoor exertion and watch for heat stress.`);
    }
  } else if (effectiveRank === 2) {
    safetyLevel = 'Caution';
    headline = `Generally acceptable for ${activityMeta.label.toLowerCase()}, with mild sensitivity caution.`;
    summary = `US AQI is ${usAqi} (${category.label}). Most people can proceed normally, though prolonged ${activityMeta.label.toLowerCase()} increases inhaled particle dose.`;
    precautions.push('Choose parks or low-traffic streets away from busy roadways.');
    if (isVulnerableGroup) {
      precautions.push('Watch for coughing, throat irritation, or shortness of breath and shorten sessions if symptoms occur.');
    }
    maskGuidance = 'Optional for unusually sensitive individuals near heavy traffic.';
  } else if (effectiveRank === 3) {
    safetyLevel = 'Limit Exposure';
    headline = `Reduce duration or intensity for ${activityMeta.label.toLowerCase()}.`;
    summary = `With US AQI at ${usAqi} (${category.label}), ${groupMeta.label.toLowerCase()} individuals face elevated respiratory stress during ${activityMeta.label.toLowerCase()}.`;
    precautions.push('Move vigorous exercise indoors or break outdoor sessions into shorter intervals.');
    precautions.push('Avoid peak rush-hour corridors where NO₂ and fine particulates concentrate.');
    if (group === 'sensitive') {
      precautions.push('Keep prescribed rescue inhalers or action plans accessible.');
    }
    maskGuidance = 'Consider a well-fitting N95/KN95/FFP2 mask for sustained outdoor travel.';
  } else {
    safetyLevel = 'Avoid Outdoors';
    headline = `Postpone ${activityMeta.label.toLowerCase()} outdoors and stay in filtered indoor air.`;
    summary = `US AQI is ${usAqi} (${category.label}). Outdoor ${activityMeta.label.toLowerCase()} significantly increases exposure for ${groupMeta.label.toLowerCase()} profiles.`;
    precautions.push('Reschedule outdoor exercise to an indoor facility with clean filtration.');
    precautions.push('Keep windows closed and run an indoor HEPA air purifier if available.');
    precautions.push('Consult a healthcare professional promptly if breathing discomfort develops.');
    maskGuidance = 'Wear a snug, well-fitting N95 or FFP2 respirator if outdoor travel is unavoidable.';
  }

  if (dataset.current.pollutants.pm2_5 !== null && dataset.current.pollutants.pm2_5 > 35) {
    precautions.push(
      `PM2.5 is elevated at ${dataset.current.pollutants.pm2_5} µg/m³; fine particles bypass nasal filtration during mouth breathing.`
    );
  }

  if (dataset.current.pollutants.ozone !== null && dataset.current.pollutants.ozone > 100) {
    precautions.push(
      `Ground-level ozone is ${dataset.current.pollutants.ozone} µg/m³; early morning hours typically carry lower ozone levels than sunny afternoons.`
    );
  }

  const reasoningFactors = [
    `US AQI ${usAqi} (${category.label})`,
    `Profile: ${groupMeta.label}`,
    `Activity: ${activityMeta.label} (${activityMeta.exertion} exertion)`,
    dominantPollutant ? `Primary driver: ${dominantPollutant}` : 'Pollutant driver unverified',
  ];

  return {
    safetyLevel,
    headline,
    summary,
    precautions,
    bestWindowHint,
    maskGuidance,
    dominantPollutant,
    reasoningFactors,
    limitations:
      'Recommendations combine gridded Open-Meteo model readings with standardized EPA/WHO exposure rules. Hyper-local roadside spikes and personal health history can alter risk. This is informational guidance, not medical advice.',
  };
}

export function buildRuleBasedStructuredAdvice(
  question: string,
  locationName: string,
  dataset: AirQualityDataset | null,
  group: SensitivityGroup,
  activity: ActivityType
): StructuredHealthAdvice {
  const rec = generateRuleBasedRecommendation(dataset, group, activity);

  if (!dataset || dataset.current.usAqi === null) {
    return {
      shortAnswer:
        'Live air quality measurements are currently unavailable, so outdoor safety cannot be reliably assessed.',
      currentConditions: `Location: ${locationName}. Live AQI and pollutant concentrations could not be retrieved.`,
      riskExplanation:
        'Without current PM2.5, ozone, or AQI readings, neither automated rules nor AI advisors can verify pollution exposure.',
      precautions: rec.precautions,
      activityGuidance: rec.bestWindowHint,
      limitations: rec.limitations,
    };
  }

  const c = dataset.current;
  const cat = classifyUsAqi(c.usAqi);
  const normalizedQ = question.toLowerCase();

  let shortAnswer = `${rec.safetyLevel}: ${rec.headline}`;
  if (normalizedQ.includes('mask') || normalizedQ.includes('n95')) {
    shortAnswer = `${rec.maskGuidance} (Current US AQI in ${locationName}: ${c.usAqi}, ${cat.label}).`;
  } else if (normalizedQ.includes('best time') || normalizedQ.includes('when')) {
    shortAnswer = `${rec.bestWindowHint} Current US AQI is ${c.usAqi} (${cat.label}).`;
  } else if (normalizedQ.includes('pm2.5')) {
    shortAnswer = `PM2.5 refers to fine inhalable particles ≤2.5 µm. In ${locationName}, PM2.5 is currently ${c.pollutants.pm2_5 ?? 'unavailable'} µg/m³.`;
  }

  const conditionParts = [
    `${locationName}: US AQI ${c.usAqi} (${cat.label})`,
    c.europeanAqi !== null ? `European AQI ${c.europeanAqi}` : null,
    c.pollutants.pm2_5 !== null ? `PM2.5 ${c.pollutants.pm2_5} µg/m³` : null,
    c.pollutants.pm10 !== null ? `PM10 ${c.pollutants.pm10} µg/m³` : null,
    c.pollutants.ozone !== null ? `O₃ ${c.pollutants.ozone} µg/m³` : null,
    c.weather.temperatureC !== null ? `${c.weather.temperatureC}°C, ${c.weather.weatherLabel}` : null,
  ].filter(Boolean);

  return {
    shortAnswer,
    currentConditions: conditionParts.join(' · '),
    riskExplanation: rec.summary,
    precautions: rec.precautions,
    activityGuidance: `${rec.bestWindowHint} ${rec.maskGuidance}`,
    limitations: rec.limitations,
  };
}

export function isHigherRiskCategory(key: AqiCategoryKey): boolean {
  return key === 'sensitive' || key === 'unhealthy' || key === 'very_unhealthy' || key === 'hazardous';
}
