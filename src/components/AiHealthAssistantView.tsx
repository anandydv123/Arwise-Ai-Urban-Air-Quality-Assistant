import { Bot, Send, Trash2, User } from 'lucide-react';
import { useId, useState } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import type { ActivityType, AiProviderPreference, SensitivityGroup } from '../types/airQuality.ts';
import { classifyUsAqi } from '../utils/aqi.ts';
import { ACTIVITY_OPTIONS, SENSITIVITY_OPTIONS } from '../utils/recommendations.ts';

const SUGGESTED_QUESTIONS = [
  'Is it safe to go running today?',
  'Should my children play outside right now?',
  'What does PM2.5 mean for my lungs?',
  'Is wearing an N95 mask useful today?',
  'What is the best time to go outside in the next 24 hours?',
];

export function AiHealthAssistantView() {
  const {
    location,
    dataset,
    sensitivityGroup,
    setSensitivityGroup,
    activity,
    setActivity,
    aiProvider,
    setAiProvider,
    chatMessages,
    aiLoading,
    askAiAssistant,
    clearChatHistory,
  } = useAppContext();

  const [input, setInput] = useState('');
  const questionInputId = useId();
  const groupSelectId = useId();
  const activitySelectId = useId();
  const providerSelectId = useId();

  const usAqi = dataset?.current.usAqi ?? null;
  const category = classifyUsAqi(usAqi);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || aiLoading) return;
    const text = input.trim();
    setInput('');
    await askAiAssistant(text);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              AI Environmental Health Assistant
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Context-aware guidance grounded in live telemetry for{' '}
              <strong>{location.name}</strong> (US AQI:{' '}
              <span className="font-mono font-semibold tabular-nums">{usAqi ?? '—'}</span> ·{' '}
              {category.label}).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor={groupSelectId}
                className="block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Sensitivity Profile
              </label>
              <select
                id={groupSelectId}
                value={sensitivityGroup}
                onChange={(e) => setSensitivityGroup(e.target.value as SensitivityGroup)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {SENSITIVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={activitySelectId}
                className="block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Activity Context
              </label>
              <select
                id={activitySelectId}
                value={activity}
                onChange={(e) => setActivity(e.target.value as ActivityType)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {ACTIVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={providerSelectId}
                className="block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                AI Provider
              </label>
              <select
                id={providerSelectId}
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as AiProviderPreference)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="auto">Auto (Gemini → Hugging Face)</option>
                <option value="gemini">Gemini AI</option>
                <option value="huggingface">Hugging Face</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Suggested questions
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={aiLoading}
                onClick={() => void askAiAssistant(q)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-label="Conversation history"
        className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Session conversation ({chatMessages.length} messages)
          </span>
          {chatMessages.length > 0 && (
            <button
              type="button"
              onClick={clearChatHistory}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear chat</span>
            </button>
          )}
        </div>

        <div className="min-h-[300px] max-h-[560px] space-y-5 overflow-y-auto p-5">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-8 w-8 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                Ask about air quality safety in {location.name}
              </h2>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Choose a suggested question above or ask your own. AirWise AI queries Gemini AI or Hugging Face on the server and automatically falls back to deterministic rule-based guidance if upstream AI providers are unavailable.
              </p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end gap-3">
                    <div className="max-w-2xl rounded-xl bg-teal-700 px-4 py-3 text-sm text-white dark:bg-teal-600">
                      {msg.text}
                    </div>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      aria-hidden="true"
                    >
                      <User className="h-4 w-4" />
                    </span>
                  </div>
                );
              }

              const structured = msg.structured;
              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/60 dark:text-teal-300"
                    aria-hidden="true"
                  >
                    <Bot className="h-4 w-4" />
                  </span>

                  <div className="flex-1 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <span>
                        {msg.source === 'gemini'
                          ? `Gemini AI (${msg.model ?? 'configured model'})`
                          : msg.source === 'huggingface'
                            ? `Hugging Face (${msg.model ?? 'configured model'})`
                            : 'Deterministic Rule-Based Engine (Fallback)'}
                      </span>
                    </div>

                    {msg.error && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                        {msg.error}
                      </div>
                    )}

                    {structured ? (
                      <div className="space-y-3 leading-relaxed text-slate-800 dark:text-slate-200">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            1. Short Answer
                          </h3>
                          <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                            {structured.shortAnswer}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            2. Current Environmental Conditions
                          </h3>
                          <p className="mt-1 text-slate-700 dark:text-slate-300">
                            {structured.currentConditions}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            3. Risk Explanation
                          </h3>
                          <p className="mt-1 text-slate-700 dark:text-slate-300">
                            {structured.riskExplanation}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            4. Recommended Precautions
                          </h3>
                          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
                            {structured.precautions.map((p, idx) => (
                              <li key={idx}>{p}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            5. Outdoor Activity Guidance
                          </h3>
                          <p className="mt-1 text-slate-700 dark:text-slate-300">
                            {structured.activityGuidance}
                          </p>
                        </div>

                        <div className="border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          <strong className="font-semibold">6. Important Limitations:</strong>{' '}
                          {structured.limitations}
                        </div>
                      </div>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {aiLoading && (
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <Bot className="h-5 w-5 animate-pulse text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span>Analyzing environmental telemetry and drafting recommendations...</span>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 border-t border-slate-200 p-4 dark:border-slate-800"
        >
          <label htmlFor={questionInputId} className="sr-only">
            Ask the AI Health Assistant a question
          </label>
          <input
            id={questionInputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="Ask e.g. 'Is it safe for my child to play soccer this afternoon?'"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={aiLoading || input.trim().length < 2}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>Ask</span>
          </button>
        </form>
      </section>
    </div>
  );
}
