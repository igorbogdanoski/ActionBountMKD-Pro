import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { buildQuestPrompt, parseAiQuest, AiQuestError, type AiQuestRequest } from '../src/lib/aiQuest';

const MODEL = 'gemini-2.0-flash';
const DAILY_LIMIT = 20;
const AI_PLANS = new Set(['starter', 'pro', 'enterprise']);

function adminApp() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)) });
  }
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
    // per-user quota entirely instead of trusting a Firestore plan field.
    if (!isAdmin) {
      const profileSnap = await getFirestore().collection('user_profiles').doc(uid).get();
      const plan = (profileSnap.data()?.plan as string | undefined) ?? 'free';
      if (!AI_PLANS.has(plan)) {
        res.status(403).json({ code: 'invalid', error: 'AI генераторот е достапен на Starter план и повисоко.' });
        return;
      }

      const withinQuota = await checkAndConsumeQuota(uid);
      if (!withinQuota) {
        res.status(429).json({ code: 'invalid', error: 'Го достигна дневниот лимит за AI генерирање. Обиди се утре.' });
        return;
      }
    }

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

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildQuestPrompt(aiReq),
      config: { responseMimeType: 'application/json', temperature: 0.9 },
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
