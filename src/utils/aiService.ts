import {
  buildQuestPrompt,
  parseAiQuest,
  AiQuestError,
  type AiQuestRequest,
  type GeneratedQuest,
} from '../lib/aiQuest';

const MODEL = 'gemini-2.0-flash';

export function getGeminiApiKey(): string | undefined {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : undefined;
}

export function isAiConfigured(): boolean {
  return getGeminiApiKey() !== undefined;
}

/**
 * Generate a quest via Gemini. Network/SDK I/O only — all parsing,
 * validation and sanitization live in the pure `lib/aiQuest` module.
 */
export async function generateQuest(req: AiQuestRequest): Promise<GeneratedQuest> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new AiQuestError('no-key', 'AI генераторот не е конфигуриран (недостасува VITE_GEMINI_API_KEY).');
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildQuestPrompt(req),
    config: { responseMimeType: 'application/json', temperature: 0.9 },
  });

  const text = response.text;
  if (!text) {
    throw new AiQuestError('empty', 'AI не врати содржина. Обиди се повторно.');
  }

  return parseAiQuest(text);
}
