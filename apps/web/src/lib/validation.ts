import { z } from 'zod';
import { stripHtml } from 'shared';

const safeString = (max: number) =>
  z.string()
    .transform(stripHtml)
    .pipe(z.string().min(1).max(max));

// ─── Quest schemas ────────────────────────────────────────────────────────────

export const QuestMetaSchema = z.object({
  title:       safeString(200),
  description: safeString(2000),
  visibility:  z.enum(['public', 'secret']),
  playMode:    z.enum(['singleplayer', 'multiplayer']),
  sequence:    z.enum(['fixed', 'random', 'selectable']),
});

export const InventoryItemSchema = z.object({
  id: z.string().min(1).max(64),
  name: safeString(80),
  icon: z.string().max(32).optional().or(z.literal('')),
  mediaUrl: z.string().url().max(500).optional().or(z.literal('')),
});

export const StageBaseSchema = z.object({
  title:       safeString(200),
  description: safeString(2000),
  points:      z.number().min(0).max(10_000).optional(),
  audioUrl:    z.string().url().max(500).optional().or(z.literal('')),
  grantsItemId: z.string().max(64).optional().or(z.literal('')),
  requiresItemId: z.string().max(64).optional().or(z.literal('')),
});

export const QuizStageSchema = StageBaseSchema.extend({
  type:          z.literal('QUIZ'),
  questionType:  z.enum(['multiple_choice', 'free_text', 'estimate_number', 'matching', 'ordering']),
  correctAnswer: z.union([z.string().max(500), z.number()]),
  options:       z.array(z.string().max(200)).max(8).optional(),
  matchingPairs: z.array(z.object({
    id: z.string().min(1).max(64),
    left: z.string().max(200),
    right: z.string().max(200),
  })).max(20).optional(),
  orderingItems: z.array(z.object({
    id: z.string().min(1).max(64),
    text: z.string().max(200),
  })).max(20).optional(),
  timeLimitSeconds: z.number().min(0).max(3600).optional(),
});

export const FindSpotStageSchema = StageBaseSchema.extend({
  type:              z.literal('FIND_SPOT'),
  targetCoordinates: z.object({
    latitude:  z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  radiusMeters: z.number().min(1).max(10_000),
});

export const ScanCodeStageSchema = StageBaseSchema.extend({
  type:           z.literal('SCAN_CODE'),
  targetQrPayload: z.string().min(1).max(500),
});

export const QrTaskStageSchema = StageBaseSchema.extend({
  type:            z.literal('QR_TASK'),
  targetQrPayload: z.string().min(1).max(500),
  taskTitle:       z.string().max(200),
  taskDescription: z.string().max(2000),
  taskMediaUrl:    z.string().url().max(500).optional().or(z.literal('')),
  answerType:      z.enum(['text', 'photo', 'multiple_choice']),
  options:         z.array(z.string().max(200)).max(6).optional(),
  correctAnswer:   z.string().max(500).optional(),
  requiredToAdvance: z.boolean(),
});

export const SurveyStageSchema = StageBaseSchema.extend({
  type:            z.literal('SURVEY'),
  surveyQuestions: z.array(z.string().max(500)).min(1).max(20),
});

// ─── Player schemas ───────────────────────────────────────────────────────────

export const PlayerNameSchema = z
  .string()
  .transform(stripHtml)
  .pipe(z.string().min(1, 'Внеси го твоето име').max(100, 'Името е предолго'));

export const QuestResultSchema = z.object({
  questId:     z.string().min(1).max(128),
  playerName:  PlayerNameSchema,
  points:      z.number().min(0).max(1_000_000),
  completedAt: z.string().datetime(),
  teamCode:    z.string().max(50).optional(),
});

export const FeedbackSchema = z.object({
  comment: z
    .string()
    .transform(stripHtml)
    .pipe(z.string().min(1, 'Коментарот е задолжителен').max(1000, 'Коментарот е предолг')),
});

// ─── Auth / email ─────────────────────────────────────────────────────────────

export const CollaboratorEmailSchema = z
  .string()
  .email('Внеси валидна email адреса')
  .max(254)
  .toLowerCase();

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestMetaInput  = z.input<typeof QuestMetaSchema>;
export type QuestMetaOutput = z.output<typeof QuestMetaSchema>;
export type QuestResultInput = z.input<typeof QuestResultSchema>;
