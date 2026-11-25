import type { StructuredHealthAdvice } from '../../src/types/airQuality.ts';
import type { AiAssistantRequestPayload } from '../utils/validation.ts';
import { detectPromptInjection } from '../utils/validation.ts';
import {
  HEALTH_ADVISOR_SAFETY_RULES,
  buildHealthAssistantPromptContext,
  normalizeStructuredHealthAdvice,
} from './aiAdviceHelper.ts';

const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_HF_MODEL = 'Qwen/Qwen3.5-9B';
const HF_FALLBACK_MODELS = [
  'Qwen/Qwen3.5-9B',
  'openai/gpt-oss-120b',
  'meta-llama/Llama-3.1-8B-Instruct',
  'meta-llama/Llama-3.2-3B-Instruct',
];
const REQUEST_TIMEOUT_MS = 12000;

export class HuggingFaceServiceError extends Error {
  readonly code: 'API_KEY_MISSING' | 'PROMPT_REJECTED' | 'RATE_LIMITED' | 'UPSTREAM_ERROR';
  readonly statusCode: number;

  constructor(
    message: string,
    code: 'API_KEY_MISSING' | 'PROMPT_REJECTED' | 'RATE_LIMITED' | 'UPSTREAM_ERROR',
    statusCode: number
  ) {
    super(message);
    this.name = 'HuggingFaceServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function getHuggingFaceApiKey(): string | null {
  const key = (process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '').trim();
  if (!key || key === 'MY_HUGGINGFACE_API_KEY') {
    return null;
  }
  return key;
}

export function isHuggingFaceConfigured(): boolean {
  return getHuggingFaceApiKey() !== null;
}

export function resolveHuggingFaceModel(rawModel = process.env.HUGGINGFACE_MODEL): string {
  const trimmed = rawModel?.trim();
  if (trimmed && /^[A-Za-z0-9._-]+\/[A-Za-z0-9._:-]+$/.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_HF_MODEL;
}

const HF_SYSTEM_PROMPT = `You are AirWise AI, an urban environmental health advisor.
Interpret the provided live air quality readings, weather conditions, 24-hour forecast summary, and user activity/sensitivity profile in clear, practical language.

${HEALTH_ADVISOR_SAFETY_RULES}
7. Respond ONLY with a valid JSON object matching this exact structure:
{
  "shortAnswer": "1-2 sentence direct answer",
  "currentConditions": "concise summary of provided AQI, pollutants, and weather",
  "riskExplanation": "plain-language explanation for the selected sensitivity group",
  "precautions": ["precaution 1", "precaution 2"],
  "activityGuidance": "outdoor timing, intensity, or indoor alternative guidance",
  "limitations": "uncertainty, model limitations, and non-medical disclaimer"
}`;

function extractJsonObject(raw: string): Partial<StructuredHealthAdvice> {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as Partial<StructuredHealthAdvice>;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Partial<StructuredHealthAdvice>;
    }
    throw new Error('Hugging Face response did not contain valid JSON.');
  }
}

function extractSafeErrorDetail(rawText: string): string {
  const sanitized = rawText
    .replace(/hf_[A-Za-z0-9]+/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .trim();

  try {
    const parsed = JSON.parse(sanitized) as {
      error?: string | { message?: string; code?: string; type?: string };
      message?: string;
    };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim().slice(0, 180);
    }
    if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) {
      return parsed.error.message.trim().slice(0, 180);
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim().slice(0, 180);
    }
  } catch {
    // non-JSON body
  }

  return sanitized.slice(0, 180);
}

export async function generateHuggingFaceHealthAdvice(
  payload: AiAssistantRequestPayload
): Promise<{ advice: StructuredHealthAdvice; model: string }> {
  if (detectPromptInjection(payload.question)) {
    throw new HuggingFaceServiceError(
      'Your question appears to contain prompt-override instructions. Please ask a normal question about air quality, pollutants, or outdoor activities.',
      'PROMPT_REJECTED',
      400
    );
  }

  const apiKey = getHuggingFaceApiKey();
  if (!apiKey) {
    throw new HuggingFaceServiceError(
      'Hugging Face API token is not configured on the server.',
      'API_KEY_MISSING',
      503
    );
  }

  const primaryModel = resolveHuggingFaceModel();
  const candidateModels = Array.from(new Set([primaryModel, ...HF_FALLBACK_MODELS]));
  const { userPrompt, normalizedHistory } = buildHealthAssistantPromptContext(payload);

  let res: Response | null = null;
  let lastStatus = 0;
  let lastDetail = '';
  let usedModel = primaryModel;

  for (let i = 0; i < candidateModels.length; i += 1) {
    const candidateModel = candidateModels[i];
    usedModel = candidateModel;

    try {
      res = await fetch(HF_ROUTER_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: candidateModel,
          messages: [
            { role: 'system', content: HF_SYSTEM_PROMPT },
            ...normalizedHistory,
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 700,
          stream: false,
        }),
      });
    } catch {
      if (i === candidateModels.length - 1) {
        throw new HuggingFaceServiceError(
          'Hugging Face inference service timed out or could not be reached.',
          'UPSTREAM_ERROR',
          502
        );
      }
      continue;
    }

    if (res.ok) {
      break;
    }

    lastStatus = res.status;
    lastDetail = extractSafeErrorDetail(await res.text());
    console.error(`[HuggingFaceService] model=${candidateModel} status=${lastStatus} detail=${lastDetail}`);

    if (lastStatus === 401 || lastStatus === 403) {
      throw new HuggingFaceServiceError(
        `Hugging Face token could not be verified (${lastDetail || `HTTP ${lastStatus}`}).`,
        'API_KEY_MISSING',
        503
      );
    }

    if (lastStatus === 429 && i === candidateModels.length - 1) {
      throw new HuggingFaceServiceError(
        'Hugging Face inference rate limit exceeded.',
        'RATE_LIMITED',
        429
      );
    }

    const canRetryNextModel =
      lastStatus === 400 ||
      lastStatus === 404 ||
      lastStatus === 422 ||
      lastStatus === 429 ||
      lastStatus >= 500;

    if (!canRetryNextModel || i === candidateModels.length - 1) {
      throw new HuggingFaceServiceError(
        `Hugging Face inference API returned status ${lastStatus}${lastDetail ? `: ${lastDetail}` : '.'}`,
        'UPSTREAM_ERROR',
        502
      );
    }
  }

  if (!res || !res.ok) {
    throw new HuggingFaceServiceError(
      `Hugging Face inference API returned status ${lastStatus || 502}${lastDetail ? `: ${lastDetail}` : '.'}`,
      'UPSTREAM_ERROR',
      502
    );
  }

  const data = (await res.json()) as {
    model?: string;
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new HuggingFaceServiceError(
      'Hugging Face returned an empty completion.',
      'UPSTREAM_ERROR',
      502
    );
  }

  let parsed: Partial<StructuredHealthAdvice>;
  try {
    parsed = extractJsonObject(content);
  } catch {
    throw new HuggingFaceServiceError(
      'Hugging Face returned an unparseable response format.',
      'UPSTREAM_ERROR',
      502
    );
  }

  return {
    advice: normalizeStructuredHealthAdvice(parsed),
    model: data.model || usedModel,
  };
}
