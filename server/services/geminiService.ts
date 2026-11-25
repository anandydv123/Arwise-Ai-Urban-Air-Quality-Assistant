import { GoogleGenAI, Type } from '@google/genai';
import type { StructuredHealthAdvice } from '../../src/types/airQuality.ts';
import type { AiAssistantRequestPayload } from '../utils/validation.ts';
import { detectPromptInjection } from '../utils/validation.ts';
import {
  HEALTH_ADVISOR_SAFETY_RULES,
  buildHealthAssistantPromptContext,
  normalizeStructuredHealthAdvice,
} from './aiAdviceHelper.ts';

export class GeminiServiceError extends Error {
  readonly code: 'API_KEY_MISSING' | 'PROMPT_REJECTED' | 'RATE_LIMITED' | 'UPSTREAM_ERROR';
  readonly statusCode: number;

  constructor(
    message: string,
    code: 'API_KEY_MISSING' | 'PROMPT_REJECTED' | 'RATE_LIMITED' | 'UPSTREAM_ERROR',
    statusCode: number
  ) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const SYSTEM_INSTRUCTION = `You are AirWise AI, an urban environmental health advisor.
Your job is to interpret provided live air quality measurements, weather conditions, 24-hour forecast summaries, and user activity/sensitivity profiles in plain, practical, scientifically accurate language.

${HEALTH_ADVISOR_SAFETY_RULES}
7. Keep answers concise, clear, and structured into the exact JSON schema requested.`;

const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';
const VALID_GEMINI_MODEL_REGEX = /^(models\/)?gemini-[a-z0-9.-]+$/i;

export function resolveGeminiModel(rawModel = process.env.GEMINI_MODEL): string {
  const trimmed = rawModel?.trim();
  if (trimmed && VALID_GEMINI_MODEL_REGEX.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_GEMINI_MODEL;
}

export async function generateHealthAssistantAdvice(
  payload: AiAssistantRequestPayload
): Promise<{ advice: StructuredHealthAdvice; model: string }> {
  if (detectPromptInjection(payload.question)) {
    throw new GeminiServiceError(
      'Your question appears to contain prompt-override instructions. Please ask a normal question about air quality, pollutants, or outdoor activities.',
      'PROMPT_REJECTED',
      400
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiServiceError(
      'Gemini API key is not configured on the server. Using rule-based guidance instead.',
      'API_KEY_MISSING',
      503
    );
  }

  const primaryModel = resolveGeminiModel();
  const fallbackModels =
    primaryModel === DEFAULT_GEMINI_MODEL
      ? [DEFAULT_GEMINI_MODEL, 'gemini-3.1-flash-lite']
      : [primaryModel, DEFAULT_GEMINI_MODEL, 'gemini-3.1-flash-lite'];

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const { userPrompt, normalizedHistory } = buildHealthAssistantPromptContext(payload);
  const recentHistory = normalizedHistory
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const promptContent = recentHistory
    ? `${userPrompt}\n\nRECENT_CONVERSATION:\n${recentHistory}`
    : userPrompt;

  const requestConfig = {
    systemInstruction: SYSTEM_INSTRUCTION,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        shortAnswer: {
          type: Type.STRING,
          description: 'A direct 1-2 sentence answer tailored to the user question and telemetry.',
        },
        currentConditions: {
          type: Type.STRING,
          description: 'Concise summary of the provided AQI, key pollutants, and weather.',
        },
        riskExplanation: {
          type: Type.STRING,
          description: 'Plain-language explanation of what these levels mean for the selected group.',
        },
        precautions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '2 to 4 actionable, realistic precautions.',
        },
        activityGuidance: {
          type: Type.STRING,
          description: 'Specific outdoor timing, intensity, or indoor alternative guidance.',
        },
        limitations: {
          type: Type.STRING,
          description: 'Explicit uncertainty, model limitations, and non-medical disclaimer.',
        },
      },
      required: [
        'shortAnswer',
        'currentConditions',
        'riskExplanation',
        'precautions',
        'activityGuidance',
        'limitations',
      ],
    },
  };

  let lastError: unknown = null;
  let usedModel = primaryModel;

  try {
    let responseText = '';
    for (let i = 0; i < fallbackModels.length; i += 1) {
      const candidateModel = fallbackModels[i];
      usedModel = candidateModel;
      try {
        const response = await ai.models.generateContent({
          model: candidateModel,
          contents: promptContent,
          config: requestConfig,
        });
        const txt = (response.text ?? '').trim();
        if (txt) {
          responseText = txt;
          break;
        }
      } catch (attemptErr) {
        lastError = attemptErr;
        const errMsg = attemptErr instanceof Error ? attemptErr.message : String(attemptErr);
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('404') ||
          errMsg.includes('NOT_FOUND');

        if (!isTransient || i === fallbackModels.length - 1) {
          throw attemptErr;
        }
        await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
      }
    }

    if (!responseText) {
      throw lastError ?? new Error('Empty response from Gemini model.');
    }

    const parsed = JSON.parse(responseText) as Partial<StructuredHealthAdvice>;
    return {
      advice: normalizeStructuredHealthAdvice(parsed),
      model: usedModel,
    };
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('[GeminiService] generateContent failed:', message);

    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
      throw new GeminiServiceError(
        'Gemini API quota temporarily exceeded. Using rule-based guidance instead.',
        'RATE_LIMITED',
        429
      );
    }
    if (
      message.includes('API_KEY_INVALID') ||
      message.includes('PERMISSION_DENIED') ||
      message.includes('403')
    ) {
      throw new GeminiServiceError(
        'Gemini API key could not be verified. Please check your GEMINI_API_KEY in Settings > Secrets.',
        'API_KEY_MISSING',
        503
      );
    }
    if (message.includes('NOT_FOUND') || message.includes('404')) {
      throw new GeminiServiceError(
        `Configured Gemini model "${usedModel}" was not found. Falling back to rule-based guidance.`,
        'UPSTREAM_ERROR',
        502
      );
    }

    let safeReason = 'Upstream error';
    try {
      const parsedErr = JSON.parse(message) as { error?: { code?: number; status?: string; message?: string } };
      if (parsedErr.error?.status || parsedErr.error?.code) {
        safeReason = `${parsedErr.error.code ?? ''} ${parsedErr.error.status ?? ''}: ${parsedErr.error.message ?? ''}`.trim();
      }
    } catch {
      safeReason = message.replace(/AIza[A-Za-z0-9_-]+|AQ\.[A-Za-z0-9_-]+/g, '[redacted]').slice(0, 120);
    }

    throw new GeminiServiceError(
      `Gemini AI service temporarily unavailable (${safeReason}). Using rule-based guidance instead.`,
      'UPSTREAM_ERROR',
      502
    );
  }
}
