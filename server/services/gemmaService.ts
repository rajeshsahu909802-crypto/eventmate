import { GoogleGenAI } from '@google/genai';
import {
  EVENTMATE_SYSTEM_PROMPT,
  buildDeterministicLocalAnswer,
  buildGroundedPrompt,
} from './contextBuilder';
import { ChatTurn, RetrievalResult } from './eventRetrieval';

export interface GemmaServiceResponse {
  answer: string;
  ai_generated: boolean;
  fallback_used: boolean;
  model_used: string;
  notice?: string;
}

function getApiKey(): string | undefined {
  const gemmaKey = process.env.GEMMA_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (
    gemmaKey &&
    gemmaKey !== 'your_actual_api_key_placeholder' &&
    gemmaKey !== 'MY_GEMINI_API_KEY'
  ) {
    return gemmaKey;
  }
  if (
    geminiKey &&
    geminiKey !== 'your_actual_api_key_placeholder' &&
    geminiKey !== 'MY_GEMINI_API_KEY'
  ) {
    return geminiKey;
  }
  return undefined;
}

export function getConfiguredModelName(): string {
  return process.env.GEMMA_MODEL?.trim() || 'gemma-3-27b-it';
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('MODEL_TIMEOUT'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function generateEventAssistantReply(
  userMessage: string,
  retrieval: RetrievalResult,
  history: ChatTurn[] = [],
  options?: { forceLocalFallback?: boolean }
): Promise<GemmaServiceResponse> {
  // 1. Prompt injection defense — immediately refuse without invoking model
  if (retrieval.isPromptInjection) {
    return {
      answer: buildDeterministicLocalAnswer(userMessage, retrieval),
      ai_generated: false,
      fallback_used: false,
      model_used: 'security-guardrail',
      notice: 'Request blocked by EventMate prompt-injection security policy.',
    };
  }

  // 2. If user explicitly selected local search mode
  if (options?.forceLocalFallback) {
    return {
      answer: buildDeterministicLocalAnswer(userMessage, retrieval),
      ai_generated: false,
      fallback_used: true,
      model_used: 'local-verified-search',
      notice: 'Local dataset retrieval mode active (AI inference bypassed).',
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      answer: buildDeterministicLocalAnswer(userMessage, retrieval),
      ai_generated: false,
      fallback_used: true,
      model_used: 'local-verified-fallback',
      notice:
        'AI API key is not configured. Showing verified answer from local event dataset search.',
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const groundedPrompt = buildGroundedPrompt(userMessage, retrieval, history);
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 15000;
  const primaryModel = getConfiguredModelName();
  const candidateModels =
    primaryModel === 'gemini-3.8-flash'
      ? ['gemini-3.8-flash']
      : [primaryModel, 'gemini-3.8-flash'];

  let lastErrorMessage = 'Model service temporarily unavailable.';

  for (const modelName of candidateModels) {
    try {
      const isGemmaFamily = modelName.toLowerCase().startsWith('gemma');
      const requestPromise = isGemmaFamily
        ? ai.models.generateContent({
            model: modelName,
            contents: `${EVENTMATE_SYSTEM_PROMPT}\n\n${groundedPrompt}`,
            config: {
              temperature: 0.2,
              topP: 0.9,
            },
          })
        : ai.models.generateContent({
            model: modelName,
            contents: groundedPrompt,
            config: {
              systemInstruction: EVENTMATE_SYSTEM_PROMPT,
              temperature: 0.2,
              topP: 0.9,
            },
          });

      const response = await withTimeout(requestPromise, timeoutMs);
      const outputText = response.text?.trim();

      if (outputText) {
        return {
          answer: outputText.slice(0, 4000),
          ai_generated: true,
          fallback_used: false,
          model_used: modelName,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'MODEL_TIMEOUT') {
        lastErrorMessage = 'The AI model request timed out.';
      } else if (/429|quota|rate_limit|resource_exhausted/i.test(msg)) {
        lastErrorMessage = 'The AI model rate limit or quota was reached.';
      } else if (/401|403|api_key|permission_denied|unauthenticated/i.test(msg)) {
        lastErrorMessage = 'AI API authentication failed. Please verify your API credentials.';
        break; // Do not retry on invalid API key
      } else {
        lastErrorMessage = 'The configured AI model is temporarily unavailable.';
      }
    }
  }

  return {
    answer: buildDeterministicLocalAnswer(userMessage, retrieval),
    ai_generated: false,
    fallback_used: true,
    model_used: 'local-verified-fallback',
    notice: `${lastErrorMessage} Showing verified answer from local event dataset search instead.`,
  };
}
