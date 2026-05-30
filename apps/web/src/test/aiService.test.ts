import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mock fn shared with the module factory.
const { generateContentMock } = vi.hoisted(() => ({ generateContentMock: vi.fn() }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

import { generateQuest, isAiConfigured, getGeminiApiKey } from '../utils/aiService';
import { AiQuestError } from '../lib/aiQuest';

const SAMPLE = JSON.stringify({
  title: 'AI авантура',
  description: 'опис',
  stages: [
    { type: 'INFO', title: 'Вовед', description: 'текст' },
    { type: 'QUIZ', title: 'Q', description: 'прашање?', questionType: 'multiple_choice', options: ['A', 'B'], correctAnswer: 'A' },
  ],
});

describe('aiService config helpers', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('reports unconfigured when key is missing', () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    expect(isAiConfigured()).toBe(false);
    expect(getGeminiApiKey()).toBeUndefined();
  });

  it('reports configured and trims the key when present', () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '  my-key  ');
    expect(isAiConfigured()).toBe(true);
    expect(getGeminiApiKey()).toBe('my-key');
  });
});

describe('generateQuest', () => {
  beforeEach(() => generateContentMock.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it('throws AiQuestError(no-key) when key is missing', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    await expect(generateQuest({ topic: 't', subject: 's', grade: 'g', stageCount: 3 }))
      .rejects.toMatchObject({ code: 'no-key' });
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('calls Gemini and parses the response into a quest', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    generateContentMock.mockResolvedValue({ text: SAMPLE });

    const quest = await generateQuest({ topic: 'Сончев систем', subject: 'Природни науки', grade: '4-6 одд.', stageCount: 4 });

    expect(generateContentMock).toHaveBeenCalledOnce();
    const arg = generateContentMock.mock.calls[0][0];
    expect(arg.model).toBe('gemini-2.0-flash');
    expect(typeof arg.contents).toBe('string');
    expect(arg.config.responseMimeType).toBe('application/json');

    expect(quest.title).toBe('AI авантура');
    expect(quest.stages).toHaveLength(2);
  });

  it('throws AiQuestError(empty) when the model returns no text', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    generateContentMock.mockResolvedValue({ text: undefined });
    await expect(generateQuest({ topic: 't', subject: 's', grade: 'g', stageCount: 3 }))
      .rejects.toMatchObject({ code: 'empty' });
  });

  it('propagates AiQuestError(parse) on malformed JSON', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    generateContentMock.mockResolvedValue({ text: 'not json' });
    await expect(generateQuest({ topic: 't', subject: 's', grade: 'g', stageCount: 3 }))
      .rejects.toBeInstanceOf(AiQuestError);
  });
});
