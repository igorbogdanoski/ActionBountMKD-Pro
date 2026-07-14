import { AiQuestError, type AiQuestRequest, type GeneratedQuest } from 'shared';
import { auth } from './firebase';

/** AI generation always runs server-side now — the client never sees a Gemini key. */
export function isAiConfigured(): boolean {
  return true;
}

/**
 * Generate a quest via the `/api/generate-quest` server endpoint. The prompt
 * build, Gemini call, parsing and sanitization all happen server-side so the
 * Gemini API key is never exposed to the browser and usage is rate-limited
 * per user. See api/generate-quest.ts.
 */
export async function generateQuest(req: AiQuestRequest): Promise<GeneratedQuest> {
  const user = auth.currentUser;
  if (!user) {
    throw new AiQuestError('no-key', 'Мора да си најавен за да генерираш авантура со AI.');
  }

  const idToken = await user.getIdToken();
  const res = await fetch('/api/generate-quest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(req),
  });

  const body = await res.json().catch(() => ({}) as { code?: string; error?: string; quest?: GeneratedQuest });

  if (!res.ok) {
    const code = (body.code as AiQuestError['code']) ?? 'empty';
    throw new AiQuestError(code, body.error ?? 'Грешка при генерирање. Обиди се повторно.');
  }
  if (!body.quest) {
    throw new AiQuestError('empty', 'AI не врати содржина. Обиди се повторно.');
  }
  return body.quest;
}
