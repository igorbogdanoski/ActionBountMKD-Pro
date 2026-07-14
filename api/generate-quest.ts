import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { buildQuestPrompt, parseAiQuest, clampStageCount, AiQuestError, type AiQuestRequest, type PromptQuality } from 'shared';

const DAILY_LIMIT = 20;
const AI_PLANS = new Set(['starter', 'pro', 'enterprise']);

// Model + reasoning budget scale with plan — Starter gets a fast, cheap
// model with no thinking; Pro/Enterprise get progressively more "thinking"
// budget (Gemini's native chain-of-thought mechanism: the model reasons
// privately before answering) paired with richer prompt scaffolding
// (buildQuestPrompt's 'advanced' quality). Admins always get the top tier.
//
// Use "-latest" aliases, not pinned versions: gemini-2.0-flash was retired
// by Google mid-project (HTTP 404 "no longer available") and broke this
// endpoint in production. Aliases always resolve to a currently-supported
// model, so this class of bug shouldn't recur. Verified directly against
// the live API (2026-07-14): gemini-flash-latest -> gemini-3.5-flash,
// gemini-pro-latest -> gemini-3.1-pro-preview.
interface TierConfig {
  model: string;
  thinkingBudget: number;
  promptQuality: PromptQuality;
}

const TIER_CONFIG: Record<'starter' | 'pro' | 'enterprise', TierConfig> = {
  starter:    { model: 'gemini-flash-latest', thinkingBudget: 0,    promptQuality: 'basic' },
  pro:        { model: 'gemini-flash-latest', thinkingBudget: 2048, promptQuality: 'advanced' },
  enterprise: { model: 'gemini-pro-latest',   thinkingBudget: 8192, promptQuality: 'advanced' },
};

function adminApp() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)) });
  }
}

// Constrains the model's output at the decoding level instead of just
// asking nicely in the prompt:
// - responseSchema (JSON mode) — without it, ~50% of responses at
//   temperature 0.9 came back as malformed JSON (verified empirically
//   against the live API) and had to be discarded with a generic error.
// - minItems/maxItems on `stages` — without it, models (especially
//   Pro-tier with heavy reasoning) sometimes ignored the prompt's "EXACTLY
//   N stages" instruction and returned fewer; the array-length constraint
//   makes the count a hard guarantee instead of a suggestion.
function buildQuestSchema(stageCount: number) {
  return {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      stages: {
        type: Type.ARRAY,
        minItems: stageCount,
        maxItems: stageCount,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['INFO', 'QUIZ'] },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            questionType: { type: Type.STRING, enum: ['multiple_choice'] },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
          },
          required: ['type', 'title', 'description'],
        },
      },
    },
    required: ['title', 'description', 'stages'],
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

async function checkAndConsumeQuota(uid: string): Promise<boolean> {
  const db = getFirestore();
  const ref = db.collection('ai_usage').doc(`${uid}_${todayKey()}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? (snap.data()?.count ?? 0) : 0;
    if (count >= DAILY_LIMIT) return false;
    tx.set(ref, { count: FieldValue.increment(1), uid, updatedAt: Timestamp.now() }, { merge: true });
    return true;
  });
}

interface VercelRequest extends IncomingMessage {
  method?: string;
  headers: IncomingMessage['headers'];
  body?: unknown;
}
interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    res.status(401).json({ code: 'no-key', error: 'Мора да си најавен за да генерираш авантура со AI.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ code: 'no-key', error: 'AI генераторот не е конфигуриран на серверот.' });
    return;
  }

  try {
    adminApp();
    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const isAdmin = decoded.admin === true;

    // The platform admin isn't a customer — skip the plan gate and the
    // per-user quota entirely, and get the top tier regardless of what
    // user_profiles.plan happens to hold.
    let tierKey: keyof typeof TIER_CONFIG = 'enterprise';
    if (!isAdmin) {
      const profileSnap = await getFirestore().collection('user_profiles').doc(uid).get();
      const plan = (profileSnap.data()?.plan as string | undefined) ?? 'free';
      if (!AI_PLANS.has(plan)) {
        res.status(403).json({ code: 'invalid', error: 'AI генераторот е достапен на Starter план и повисоко.' });
        return;
      }
      tierKey = plan as keyof typeof TIER_CONFIG;

      const withinQuota = await checkAndConsumeQuota(uid);
      if (!withinQuota) {
        res.status(429).json({ code: 'invalid', error: 'Го достигна дневниот лимит за AI генерирање. Обиди се утре.' });
        return;
      }
    }
    const tier = TIER_CONFIG[tierKey];

    const body = (req.body ?? {}) as Partial<AiQuestRequest>;
    const aiReq: AiQuestRequest = {
      topic: String(body.topic ?? '').slice(0, 200),
      subject: String(body.subject ?? '').slice(0, 60),
      grade: String(body.grade ?? '').slice(0, 60),
      stageCount: Number(body.stageCount) || 5,
      language: body.language === 'en' ? 'en' : 'mk',
    };
    if (aiReq.topic.trim().length < 3) {
      res.status(400).json({ code: 'invalid', error: 'Темата е премногу кратка.' });
      return;
    }
    const stageCount = clampStageCount(aiReq.stageCount);

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: tier.model,
      contents: buildQuestPrompt(aiReq, tier.promptQuality),
      config: {
        responseMimeType: 'application/json',
        responseSchema: buildQuestSchema(stageCount),
        temperature: 0.9,
        thinkingConfig: { thinkingBudget: tier.thinkingBudget },
      },
    });

    const text = response.text;
    if (!text) {
      res.status(502).json({ code: 'empty', error: 'AI не врати содржина. Обиди се повторно.' });
      return;
    }

    const quest = parseAiQuest(text);
    res.status(200).json({ quest });
  } catch (err) {
    if (err instanceof AiQuestError) {
      res.status(422).json({ code: err.code, error: err.message });
      return;
    }
    console.error('generate-quest error:', err);
    res.status(500).json({ code: 'empty', error: 'Грешка при генерирање. Обиди се повторно.' });
  }
}
