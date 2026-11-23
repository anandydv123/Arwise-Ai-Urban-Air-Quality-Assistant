import { z } from 'zod';

export const coordinatesSchema = z.object({
  lat: z.coerce
    .number()
    .finite()
    .min(-90, 'Latitude must be between -90 and 90.')
    .max(90, 'Latitude must be between -90 and 90.'),
  lon: z.coerce
    .number()
    .finite()
    .min(-180, 'Longitude must be between -180 and 180.')
    .max(180, 'Longitude must be between -180 and 180.'),
});

export const citySearchSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Search query must be at least 2 characters.')
    .max(80, 'Search query must be 80 characters or fewer.')
    .regex(/^[\p{L}\p{N}\s,.'-]+$/u, 'Search query contains unsupported characters.'),
});

const nullableMetric = z.number().finite().min(0).max(50000).nullable();

export const aiAssistantRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, 'Please enter a question.')
    .max(500, 'Question must be 500 characters or fewer.'),
  locationName: z.string().trim().min(1).max(120),
  sensitivityGroup: z.enum(['general', 'child', 'senior', 'sensitive', 'athlete']),
  activity: z.enum(['walking', 'running', 'cycling', 'sports', 'general']),
  provider: z.enum(['auto', 'gemini', 'huggingface']).optional().default('auto'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().trim().min(1).max(800),
      })
    )
    .max(6)
    .optional()
    .default([]),
  environmentalContext: z
    .object({
      usAqi: z.number().finite().min(0).max(1000).nullable(),
      europeanAqi: z.number().finite().min(0).max(1000).nullable(),
      observedAt: z.string().max(64).nullable(),
      pollutants: z.object({
        pm2_5: nullableMetric,
        pm10: nullableMetric,
        ozone: nullableMetric,
        nitrogenDioxide: nullableMetric,
        sulfurDioxide: nullableMetric,
        carbonMonoxide: nullableMetric,
      }),
      weather: z.object({
        temperatureC: z.number().finite().min(-90).max(70).nullable(),
        humidityPercent: z.number().finite().min(0).max(100).nullable(),
        windSpeedKmh: z.number().finite().min(0).max(400).nullable(),
        weatherLabel: z.string().max(80),
      }),
      next24hSummary: z
        .object({
          minUsAqi: z.number().finite().min(0).max(1000).nullable(),
          maxUsAqi: z.number().finite().min(0).max(1000).nullable(),
          peakTime: z.string().max(64).nullable(),
        })
        .optional(),
    })
    .nullable(),
});

export type AiAssistantRequestPayload = z.infer<typeof aiAssistantRequestSchema>;

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(system|safety|developer)\s+instructions?/i,
  /reveal\s+(your\s+)?(system\s+prompt|api\s+key|secret|environment)/i,
  /print\s+process\.env/i,
  /act\s+as\s+(a\s+)?(doctor|physician|medical\s+diagnostician)/i,
  /<\s*\/?\s*(system|instruction|developer)\s*>/i,
];

export function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export function sanitizeTextForPrompt(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim();
}
