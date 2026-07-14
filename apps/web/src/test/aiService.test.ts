import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getIdTokenMock, mockAuth } = vi.hoisted(() => {
  const getIdTokenMock = vi.fn().mockResolvedValue('fake-id-token');
  return {
    getIdTokenMock,
    mockAuth: { currentUser: { getIdToken: getIdTokenMock } as { getIdToken: typeof getIdTokenMock } | null },
  };
});
vi.mock('../utils/firebase', () => ({ auth: mockAuth }));

import { generateQuest, isAiConfigured } from '../utils/aiService';
import { AiQuestError } from 'shared';

const SAMPLE_QUEST = {
  title: 'AI авантура',
  description: 'опис',
  stages: [
    { id: 'a', order: 0, type: 'INFO', title: 'Вовед', description: 'текст', points: 50, mediaType: 'none' },
  ],
};

describe('isAiConfigured', () => {
  it('is always true — generation runs server-side now', () => {
    expect(isAiConfigured()).toBe(true);
  });
});

describe('generateQuest', () => {
  beforeEach(() => {
    getIdTokenMock.mockClear();
    mockAuth.currentUser = { getIdToken: getIdTokenMock };
    vi.stubGlobal('fetch', vi.fn());
  });

  it('throws AiQuestError(no-key) when no user is signed in', async () => {
    mockAuth.currentUser = null;
    await expect(generateQuest({ topic: 't', subject: 's', grade: 'g', stageCount: 3 }))
      .rejects.toMatchObject({ code: 'no-key' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the Firebase ID token and request body to the server endpoint', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ quest: SAMPLE_QUEST }),
    });

    const quest = await generateQuest({ topic: 'Сончев систем', subject: 'Природни науки', grade: '4-6 одд.', stageCount: 4 });

    expect(fetch).toHaveBeenCalledWith('/api/generate-quest', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer fake-id-token' }),
    }));
    expect(quest.title).toBe('AI авантура');
  });

  it('propagates the server error code and message on failure', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ code: 'invalid', error: 'Го достигна дневниот лимит.' }),
    });

    await expect(generateQuest({ topic: 't', subject: 's', grade: 'g', stageCount: 3 }))
      .rejects.toMatchObject({ code: 'invalid', message: 'Го достигна дневниот лимит.' });
  });

  it('throws AiQuestError(empty) when the server returns no quest', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });
    await expect(generateQuest({ topic: 't', subject: 's', grade: 'g', stageCount: 3 }))
      .rejects.toBeInstanceOf(AiQuestError);
  });
});
