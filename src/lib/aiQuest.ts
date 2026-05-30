import { z } from 'zod';
import type { Stage, InfoStage, QuizStage } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MIN_STAGES = 3;
export const MAX_STAGES = 12;
export const DEFAULT_STAGE_POINTS = 50;

/** Clamp a requested stage count into the supported range. */
export function clampStageCount(n: number): number {
  if (!Number.isFinite(n)) return MIN_STAGES;
  return Math.max(MIN_STAGES, Math.min(MAX_STAGES, Math.round(n)));
}

// ─── Request / result types ────────────────────────────────────────────────────

export interface AiQuestRequest {
  topic: string;
  subject: string;
  grade: string;
  stageCount: number;
  language?: 'mk' | 'en';
}

export interface GeneratedQuest {
  title: string;
  description: string;
  stages: Stage[];
}

export type AiQuestErrorCode = 'no-key' | 'empty' | 'parse' | 'invalid';

export class AiQuestError extends Error {
  constructor(public code: AiQuestErrorCode, message: string) {
    super(message);
    this.name = 'AiQuestError';
  }
}

// ─── Sanitization ───────────────────────────────────────────────────────────────
// Mirrors lib/validation.ts: strip dangerous blocks + all tags to prevent XSS.

function stripHtml(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function sanitizeText(value: unknown, max: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const clean = stripHtml(value).slice(0, max);
  return clean.length > 0 ? clean : fallback;
}

// ─── Prompt builder ──────────────────────────────────────────────────────────────

/**
 * Build a deterministic instruction prompt for the model. Always asks for a
 * strict JSON object (no prose) limited to INFO and QUIZ stages.
 */
export function buildQuestPrompt(req: AiQuestRequest): string {
  const stageCount = clampStageCount(req.stageCount);
  const topic = req.topic.trim();
  const subject = req.subject.trim();
  const grade = req.grade.trim();
  const isMath = /матема|math|алгеб|геометр/i.test(`${subject} ${topic}`);

  return [
    'Ти си искусен наставник кој создава образовни авантури (quest) за ученици.',
    `Создади авантура на МАКЕДОНСКИ ЈАЗИК за темата: „${topic}".`,
    `Предмет: ${subject}. Одделение/возраст: ${grade}.`,
    `Авантурата мора да има ТОЧНО ${stageCount} етапи.`,
    '',
    'Правила за етапите:',
    '- Користи само два типа: "INFO" (краток едукативен текст) и "QUIZ" (прашање).',
    '- Прва етапа нека биде "INFO" вовед во темата.',
    '- Барем половина од етапите нека бидат "QUIZ".',
    '- За "QUIZ" користи "questionType": "multiple_choice" со 3-4 опции и точниот одговор во "correctAnswer" (мора да биде една од опциите).',
    isMath
      ? '- Бидејќи е математика, пишувај формули во KaTeX синтакса меѓу знаци за долар, на пр. $x^2 + 1$.'
      : '- Содржината нека е фактички точна и прилагодена на возраста.',
    '',
    'Врати ИСКЛУЧИВО валиден JSON објект (без markdown, без објаснувања) со следната структура:',
    '{',
    '  "title": "string",',
    '  "description": "string",',
    '  "stages": [',
    '    { "type": "INFO", "title": "string", "description": "string" },',
    '    { "type": "QUIZ", "title": "string", "description": "string", "questionType": "multiple_choice", "options": ["string"], "correctAnswer": "string" }',
    '  ]',
    '}',
  ].join('\n');
}

// ─── Raw AI response schema ──────────────────────────────────────────────────────

const RawStageSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  questionType: z.string().optional(),
  options: z.array(z.any()).optional(),
  correctAnswer: z.union([z.string(), z.number()]).optional(),
});

const RawQuestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  stages: z.array(RawStageSchema),
});

type RawStage = z.infer<typeof RawStageSchema>;

// ─── JSON extraction ──────────────────────────────────────────────────────────────

/** Strip ``` fences and isolate the first {...} block, then JSON.parse. */
function extractJson(text: string): unknown {
  let body = text.trim();
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) body = fence[1].trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    body = body.slice(start, end + 1);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new AiQuestError('parse', 'Одговорот од AI не е валиден JSON.');
  }
}

// ─── Stage mapping ────────────────────────────────────────────────────────────────

function defaultMakeId(): string {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); }
}

const QUESTION_TYPES = ['multiple_choice', 'free_text', 'estimate_number'] as const;
type QuestionType = (typeof QUESTION_TYPES)[number];

function toQuizStage(raw: RawStage, base: { id: string; order: number }, title: string, description: string): QuizStage {
  const options = Array.isArray(raw.options)
    ? raw.options.map(o => sanitizeText(o, 200)).filter(Boolean).slice(0, 8)
    : [];

  let questionType: QuestionType =
    (QUESTION_TYPES as readonly string[]).includes(raw.questionType ?? '')
      ? (raw.questionType as QuestionType)
      : options.length > 0 ? 'multiple_choice' : 'free_text';

  // multiple_choice needs at least two options; otherwise fall back to free_text
  if (questionType === 'multiple_choice' && options.length < 2) {
    questionType = 'free_text';
  }

  let correctAnswer: string | number;
  if (questionType === 'estimate_number') {
    correctAnswer = typeof raw.correctAnswer === 'number' ? raw.correctAnswer : Number(raw.correctAnswer) || 0;
  } else if (questionType === 'multiple_choice') {
    if (typeof raw.correctAnswer === 'number' && options[raw.correctAnswer] !== undefined) {
      correctAnswer = options[raw.correctAnswer];
    } else {
      const ans = sanitizeText(raw.correctAnswer, 500);
      correctAnswer = options.includes(ans) ? ans : options[0] ?? '';
    }
  } else {
    correctAnswer = sanitizeText(raw.correctAnswer, 500);
  }

  const stage: QuizStage = {
    ...base,
    type: 'QUIZ',
    title,
    description,
    points: DEFAULT_STAGE_POINTS,
    questionType,
    correctAnswer,
    requiredToAdvance: false,
  };
  if (questionType === 'multiple_choice') stage.options = options;
  return stage;
}

function toInfoStage(base: { id: string; order: number }, title: string, description: string): InfoStage {
  return {
    ...base,
    type: 'INFO',
    title,
    description,
    points: DEFAULT_STAGE_POINTS,
    mediaType: 'none',
  };
}

function toStage(raw: RawStage, index: number, makeId: () => string): Stage {
  const base = { id: makeId(), order: index };
  const title = sanitizeText(raw.title, 200, `Етапа ${index + 1}`);
  const description = sanitizeText(raw.description, 2000);
  const type = (raw.type ?? '').toUpperCase();
  if (type === 'QUIZ') return toQuizStage(raw, base, title, description);
  return toInfoStage(base, title, description);
}

// ─── Parser ────────────────────────────────────────────────────────────────────────

export interface ParseOptions {
  makeId?: () => string;
}

/**
 * Parse + validate + sanitize a raw model response into a preview-ready quest.
 * Accepts either a raw JSON string or an already-parsed object.
 */
export function parseAiQuest(raw: unknown, opts: ParseOptions = {}): GeneratedQuest {
  const makeId = opts.makeId ?? defaultMakeId;
  const data = typeof raw === 'string' ? extractJson(raw) : raw;

  const result = RawQuestSchema.safeParse(data);
  if (!result.success || result.data.stages.length === 0) {
    throw new AiQuestError('invalid', 'AI одговорот нема валидни етапи.');
  }

  const title = sanitizeText(result.data.title, 200, 'Нова авантура');
  const description = sanitizeText(result.data.description, 2000, 'Генерирана авантура.');
  const stages = result.data.stages
    .slice(0, MAX_STAGES)
    .map((s, i) => toStage(s, i, makeId));

  return { title, description, stages };
}
