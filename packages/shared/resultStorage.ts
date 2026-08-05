import type { QuestResult, QuizAnswerRecord, StageSubmission } from './types.js';

export const RESULT_SCHEMA_VERSION = 2 as const;
export const RESULT_TELEMETRY_COLLECTION = 'quest_result_telemetry';
export const RESULT_PROGRESS_CHUNK_SIZE = 3;
export const RESULT_SUBMISSION_CHUNK_SIZE = 1;
export const RESULT_TELEMETRY_WRITES_PER_BATCH = 1;
export const RESULT_PROGRESS_CHUNK_IDS = Array.from({ length: 34 }, (_, index) => String(index));
export const RESULT_SUBMISSION_CHUNK_IDS = Array.from({ length: 30 }, (_, index) => String(index));

export interface ResultProgressChunk {
  resultId: string;
  questId: string;
  kind: 'progress';
  chunkId: string;
  chunkIndex: number;
  stageDurations: NonNullable<QuestResult['stageDurations']>;
  quizAnswers: QuizAnswerRecord[];
}

export interface ResultSubmissionChunk {
  resultId: string;
  questId: string;
  kind: 'submissions';
  chunkId: string;
  chunkIndex: number;
  submissions: StageSubmission[];
}

export type ResultTelemetryChunk = ResultProgressChunk | ResultSubmissionChunk;

export interface ResultTelemetryWrite {
  id: string;
  data: ResultTelemetryChunk;
}

export type QuestResultDocument = Omit<
  QuestResult,
  'stageDurations' | 'submissions' | 'quizAnswers'
> & {
  schemaVersion: typeof RESULT_SCHEMA_VERSION;
  stageDurationCount: number;
  submissionCount: number;
  quizAnswerCount: number;
};

function assertBoundedString(value: unknown, max: number, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > max) {
    throw new TypeError(`${label} must be a non-empty string with at most ${max} characters`);
  }
}

function validateStageDurations(items: QuestResult['stageDurations']): void {
  if ((items?.length ?? 0) > 100) throw new TypeError('stageDurations exceeds the 100-item limit');
  for (const item of items ?? []) {
    assertBoundedString(item.stageId, 128, 'stage duration stageId');
    if (!Number.isFinite(item.durationSec) || item.durationSec < 0 || item.durationSec > 86_400) {
      throw new TypeError('stage duration must be between 0 and 86400 seconds');
    }
  }
}

function validateSubmission(item: StageSubmission): void {
  assertBoundedString(item.stageId, 128, 'submission stageId');
  if (!['photo', 'video', 'audio', 'survey'].includes(item.type)) {
    throw new TypeError('submission type is invalid');
  }
  if (item.type === 'survey') {
    if (item.mediaUrl !== undefined || !Array.isArray(item.surveyAnswers) || item.surveyAnswers.length > 20) {
      throw new TypeError('survey submission must contain at most 20 answers and no media URL');
    }
    for (const answer of item.surveyAnswers) {
      if (typeof answer !== 'string' || answer.length > 2_000) {
        throw new TypeError('survey answer must be a string with at most 2000 characters');
      }
    }
    return;
  }
  assertBoundedString(item.mediaUrl, 2_048, 'submission mediaUrl');
  if (item.surveyAnswers !== undefined) {
    throw new TypeError('media submission cannot contain survey answers');
  }
}

function validateQuizAnswer(item: QuizAnswerRecord): void {
  assertBoundedString(item.stageId, 128, 'quiz answer stageId');
  if (typeof item.selectedAnswer !== 'string' || item.selectedAnswer.length > 10_000) {
    throw new TypeError('selected quiz answer must be a string with at most 10000 characters');
  }
  if (typeof item.correct !== 'boolean') {
    throw new TypeError('quiz answer correct must be boolean');
  }
}

/**
 * Converts one in-memory result into an immutable v2 parent plus bounded
 * telemetry documents. Small chunks keep every Firestore rules evaluation
 * safely below the 1000-expression ceiling. Writers persist these documents in
 * small ordered batches; readers expose v2 telemetry only after every expected
 * chunk is present and structurally consistent.
 */
export function splitQuestResultForStorage(result: QuestResult): {
  document: QuestResultDocument;
  telemetry: ResultTelemetryWrite[];
} {
  assertBoundedString(result.id, 128, 'result id');
  assertBoundedString(result.questId, 128, 'quest id');
  validateStageDurations(result.stageDurations);
  if ((result.submissions?.length ?? 0) > 30) throw new TypeError('submissions exceeds the 30-item limit');
  if ((result.quizAnswers?.length ?? 0) > 100) throw new TypeError('quizAnswers exceeds the 100-item limit');
  for (const item of result.submissions ?? []) validateSubmission(item);
  for (const item of result.quizAnswers ?? []) validateQuizAnswer(item);

  const {
    stageDurations = [],
    submissions = [],
    quizAnswers = [],
    ...summary
  } = result;
  const document: QuestResultDocument = {
    ...summary,
    schemaVersion: RESULT_SCHEMA_VERSION,
    stageDurationCount: stageDurations.length,
    submissionCount: submissions.length,
    quizAnswerCount: quizAnswers.length,
  };

  const telemetry: ResultTelemetryWrite[] = [];
  const progressChunkCount = Math.max(
    Math.ceil(stageDurations.length / RESULT_PROGRESS_CHUNK_SIZE),
    Math.ceil(quizAnswers.length / RESULT_PROGRESS_CHUNK_SIZE),
  );
  for (let index = 0; index < progressChunkCount; index++) {
    const chunkId = RESULT_PROGRESS_CHUNK_IDS[index];
    const start = index * RESULT_PROGRESS_CHUNK_SIZE;
    telemetry.push({
      id: `${result.id}__progress__${chunkId}`,
      data: {
        resultId: result.id,
        questId: result.questId,
        kind: 'progress',
        chunkId,
        chunkIndex: index,
        stageDurations: stageDurations.slice(start, start + RESULT_PROGRESS_CHUNK_SIZE),
        quizAnswers: quizAnswers.slice(start, start + RESULT_PROGRESS_CHUNK_SIZE),
      },
    });
  }
  for (let start = 0; start < submissions.length; start += RESULT_SUBMISSION_CHUNK_SIZE) {
    const chunkId = RESULT_SUBMISSION_CHUNK_IDS[start / RESULT_SUBMISSION_CHUNK_SIZE];
    telemetry.push({
      id: `${result.id}__submissions__${chunkId}`,
      data: {
        resultId: result.id,
        questId: result.questId,
        kind: 'submissions',
        chunkId,
        chunkIndex: start / RESULT_SUBMISSION_CHUNK_SIZE,
        submissions: submissions.slice(start, start + RESULT_SUBMISSION_CHUNK_SIZE),
      },
    });
  }
  return { document, telemetry };
}

/** Hydrates v2 telemetry while leaving legacy inline results unchanged. */
export function hydrateQuestResult(
  result: QuestResult,
  chunks: ResultTelemetryChunk[],
): QuestResult {
  if (result.schemaVersion !== RESULT_SCHEMA_VERSION) return result;

  for (const chunk of chunks) {
    if (chunk.resultId !== result.id || chunk.questId !== result.questId) {
      throw new TypeError('telemetry chunk identity does not match its result');
    }
  }
  const progress = chunks
    .filter((chunk): chunk is ResultProgressChunk => chunk.kind === 'progress')
    .sort((left, right) => left.chunkIndex - right.chunkIndex);
  const submissionChunks = chunks
    .filter((chunk): chunk is ResultSubmissionChunk => chunk.kind === 'submissions')
    .sort((left, right) => left.chunkIndex - right.chunkIndex);
  const expectedProgressChunks = Math.max(
    Math.ceil((result.stageDurationCount ?? 0) / RESULT_PROGRESS_CHUNK_SIZE),
    Math.ceil((result.quizAnswerCount ?? 0) / RESULT_PROGRESS_CHUNK_SIZE),
  );
  const expectedSubmissionChunks = Math.ceil(
    (result.submissionCount ?? 0) / RESULT_SUBMISSION_CHUNK_SIZE,
  );
  if (progress.length !== expectedProgressChunks
      || submissionChunks.length !== expectedSubmissionChunks
      || progress.some((chunk, index) => chunk.chunkIndex !== index
        || chunk.chunkId !== RESULT_PROGRESS_CHUNK_IDS[index])
      || submissionChunks.some((chunk, index) => chunk.chunkIndex !== index
        || chunk.chunkId !== RESULT_SUBMISSION_CHUNK_IDS[index])) {
    throw new TypeError('telemetry chunk sequence does not match the result summary');
  }
  const stageDurations = progress.flatMap(chunk => chunk.stageDurations);
  const quizAnswers = progress.flatMap(chunk => chunk.quizAnswers);
  const submissions = submissionChunks.flatMap(chunk => chunk.submissions);
  if (stageDurations.length !== result.stageDurationCount
      || submissions.length !== result.submissionCount
      || quizAnswers.length !== result.quizAnswerCount) {
    throw new TypeError('telemetry chunk counts do not match the result summary');
  }

  return {
    ...result,
    ...(stageDurations.length ? { stageDurations } : {}),
    ...(submissions.length ? { submissions } : {}),
    ...(quizAnswers.length ? { quizAnswers } : {}),
  };
}
