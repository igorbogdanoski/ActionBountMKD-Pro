import type { Quest, Rubric, Stage, SwitchCondition } from './types.js';

export const QUEST_STAGE_SCHEMA_VERSION = 2 as const;
export const QUEST_STAGES_COLLECTION = 'quest_stages';
export const MAX_QUEST_STAGES = 100;

export type QuestSummary = Omit<Quest, 'stages'> & { stageCount: number };
export type QuestStageDocument = Stage & {
  questId: string;
  creatorId: string;
  stageRevision: string;
};

type RecordValue = Record<string, unknown>;

const BASE_STAGE_KEYS = [
  'id', 'type', 'title', 'description', 'order', 'points', 'audioUrl',
  'grantsItemId', 'requiresItemId', 'isIntro', 'isOutro', 'objectiveRef',
] as const;

const TYPE_KEYS: Record<Stage['type'], readonly string[]> = {
  INFO: ['mediaUrl', 'mediaType'],
  QUIZ: ['questionType', 'options', 'correctAnswer', 'matchingPairs', 'orderingItems', 'timeLimitSeconds', 'requiredToAdvance', 'hintText'],
  MISSION: ['submissionType', 'rubric'],
  FIND_SPOT: ['targetCoordinates', 'radiusMeters', 'mapIcon', 'showMode', 'requiredToAdvance'],
  SCAN_CODE: ['targetQrPayload'],
  QR_TASK: ['targetQrPayload', 'taskTitle', 'taskDescription', 'taskMediaUrl', 'answerType', 'options', 'correctAnswer', 'requiredToAdvance'],
  SURVEY: ['surveyQuestions', 'rubric'],
  TOURNAMENT: ['teamCount', 'taskDescription', 'judgingMode'],
  SWITCH: ['conditions', 'defaultTargetStageId', 'showPathsToPlayer'],
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: RecordValue, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every(key => allowed.has(key));
}

function isString(value: unknown, max: number, min = 0): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

function isFiniteNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function optional(value: RecordValue, key: string, predicate: (candidate: unknown) => boolean): boolean {
  return !(key in value) || predicate(value[key]);
}

function isStringList(value: unknown, maxItems: number, maxLength: number, minItems = 0): value is string[] {
  return Array.isArray(value)
    && value.length >= minItems
    && value.length <= maxItems
    && value.every(item => isString(item, maxLength));
}

function isRubric(value: unknown): value is Rubric {
  if (!isRecord(value) || !hasOnlyKeys(value, ['criteria', 'feedbackPresets'])) return false;
  if (!Array.isArray(value.criteria) || value.criteria.length > 8) return false;
  if (!value.criteria.every(criterion => {
    if (!isRecord(criterion) || !hasOnlyKeys(criterion, ['id', 'title', 'levels'])) return false;
    if (!isString(criterion.id, 64, 1) || !isString(criterion.title, 120)) return false;
    if (!Array.isArray(criterion.levels) || criterion.levels.length > 5) return false;
    return criterion.levels.every(level => isRecord(level)
      && hasOnlyKeys(level, ['id', 'label', 'points', 'descriptor'])
      && isString(level.id, 64, 1)
      && isString(level.label, 120)
      && isFiniteNumber(level.points, 0, 1000)
      && optional(level, 'descriptor', candidate => isString(candidate, 500)));
  })) return false;
  return optional(value, 'feedbackPresets', candidate => isStringList(candidate, 12, 200));
}

function isSwitchCondition(value: unknown): value is SwitchCondition {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'id', 'label', 'minPoints', 'maxPoints', 'requiredStageIds',
    'requiredItemId', 'targetStageId',
  ])) return false;
  return isString(value.id, 64, 1)
    && isString(value.label, 500)
    && isString(value.targetStageId, 128)
    && optional(value, 'minPoints', candidate => isFiniteNumber(candidate, -1_000_000, 1_000_000))
    && optional(value, 'maxPoints', candidate => isFiniteNumber(candidate, -1_000_000, 1_000_000))
    && optional(value, 'requiredStageIds', candidate => isStringList(candidate, 20, 128))
    && optional(value, 'requiredItemId', candidate => isString(candidate, 64));
}

function hasValidBase(value: RecordValue): boolean {
  return isString(value.id, 128, 1)
    && !value.id.includes('/')
    && isString(value.title, 200)
    && isString(value.description, 2000)
    && Number.isInteger(value.order)
    && isFiniteNumber(value.order, 0, MAX_QUEST_STAGES - 1)
    && optional(value, 'points', candidate => isFiniteNumber(candidate, 0, 10_000))
    && optional(value, 'audioUrl', candidate => isString(candidate, 2048))
    && optional(value, 'grantsItemId', candidate => isString(candidate, 64))
    && optional(value, 'requiresItemId', candidate => isString(candidate, 64))
    && optional(value, 'objectiveRef', candidate => isString(candidate, 64, 1))
    && optional(value, 'isIntro', candidate => typeof candidate === 'boolean')
    && optional(value, 'isOutro', candidate => typeof candidate === 'boolean');
}

export function isValidQuestStage(value: unknown): value is Stage {
  if (!isRecord(value) || typeof value.type !== 'string' || !(value.type in TYPE_KEYS)) return false;
  const type = value.type as Stage['type'];
  if (!hasOnlyKeys(value, [...BASE_STAGE_KEYS, ...TYPE_KEYS[type]]) || !hasValidBase(value)) return false;

  switch (type) {
    case 'INFO':
      return optional(value, 'mediaUrl', candidate => isString(candidate, 2048))
        && optional(value, 'mediaType', candidate => ['image', 'video', 'none'].includes(candidate as string));
    case 'QUIZ':
      return ['multiple_choice', 'free_text', 'estimate_number', 'matching', 'ordering'].includes(value.questionType as string)
        && (isString(value.correctAnswer, 500) || isFiniteNumber(value.correctAnswer, -1_000_000_000, 1_000_000_000))
        && optional(value, 'options', candidate => isStringList(candidate, 8, 200))
        && optional(value, 'matchingPairs', candidate => Array.isArray(candidate) && candidate.length <= 20 && candidate.every(pair =>
          isRecord(pair) && hasOnlyKeys(pair, ['id', 'left', 'right'])
          && isString(pair.id, 64, 1) && isString(pair.left, 200) && isString(pair.right, 200)))
        && optional(value, 'orderingItems', candidate => Array.isArray(candidate) && candidate.length <= 20 && candidate.every(item =>
          isRecord(item) && hasOnlyKeys(item, ['id', 'text'])
          && isString(item.id, 64, 1) && isString(item.text, 200)))
        && optional(value, 'timeLimitSeconds', candidate => isFiniteNumber(candidate, 0, 3600))
        && optional(value, 'requiredToAdvance', candidate => typeof candidate === 'boolean')
        && optional(value, 'hintText', candidate => isString(candidate, 2000));
    case 'MISSION':
      return ['photo', 'video', 'audio'].includes(value.submissionType as string)
        && optional(value, 'rubric', isRubric);
    case 'FIND_SPOT':
      return isRecord(value.targetCoordinates)
        && hasOnlyKeys(value.targetCoordinates, ['latitude', 'longitude'])
        && isFiniteNumber(value.targetCoordinates.latitude, -90, 90)
        && isFiniteNumber(value.targetCoordinates.longitude, -180, 180)
        && isFiniteNumber(value.radiusMeters, 1, 10_000)
        && optional(value, 'mapIcon', candidate => isString(candidate, 64))
        && optional(value, 'showMode', candidate => ['map', 'arrow', 'none'].includes(candidate as string))
        && optional(value, 'requiredToAdvance', candidate => typeof candidate === 'boolean');
    case 'SCAN_CODE':
      return isString(value.targetQrPayload, 500);
    case 'QR_TASK':
      return isString(value.targetQrPayload, 500)
        && isString(value.taskTitle, 200)
        && isString(value.taskDescription, 2000)
        && ['text', 'photo', 'multiple_choice'].includes(value.answerType as string)
        && typeof value.requiredToAdvance === 'boolean'
        && optional(value, 'taskMediaUrl', candidate => isString(candidate, 2048))
        && optional(value, 'options', candidate => isStringList(candidate, 6, 200))
        && optional(value, 'correctAnswer', candidate => isString(candidate, 500));
    case 'SURVEY':
      return isStringList(value.surveyQuestions, 20, 500, 1)
        && optional(value, 'rubric', isRubric);
    case 'TOURNAMENT':
      return optional(value, 'teamCount', candidate => Number.isInteger(candidate) && isFiniteNumber(candidate, 2, 20))
        && optional(value, 'taskDescription', candidate => isString(candidate, 2000))
        && optional(value, 'judgingMode', candidate => ['points', 'time', 'manual'].includes(candidate as string));
    case 'SWITCH':
      return Array.isArray(value.conditions)
        && value.conditions.length <= 20
        && value.conditions.every(isSwitchCondition)
        && typeof value.showPathsToPlayer === 'boolean'
        && optional(value, 'defaultTargetStageId', candidate => isString(candidate, 128));
  }
}

function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .map(([key, child]) => [key, withoutUndefined(child)]));
}

export function questStageDocumentId(questId: string, stageId: string): string {
  return `${questId}__${stageId}`;
}

export function splitQuestForStageStorage(quest: Quest, stageRevision: string): {
  document: RecordValue;
  stages: QuestStageDocument[];
} {
  if (!isString(quest.id, 128, 1) || quest.id.includes('/')) throw new TypeError('Quest id must be a bounded Firestore document id');
  if (!isString(quest.creatorId, 128, 1)) throw new TypeError('Quest creatorId is required');
  if (!isString(stageRevision, 128, 20)) throw new TypeError('Stage revision must be at least 20 characters');
  if (!Array.isArray(quest.stages) || quest.stages.length > MAX_QUEST_STAGES) throw new TypeError('Quest stage count exceeds 100');

  const ids = new Set<string>();
  quest.stages.forEach((stage, index) => {
    if (!isValidQuestStage(stage)) throw new TypeError(`Invalid quest stage at index ${index}`);
    if (stage.order !== index) throw new TypeError(`Quest stage order must be contiguous at index ${index}`);
    if (ids.has(stage.id)) throw new TypeError(`Duplicate quest stage id: ${stage.id}`);
    ids.add(stage.id);
  });

  const {
    stages: _stages,
    isPublic: _legacyIsPublic,
    stageSchemaVersion: _previousSchemaVersion,
    stageRevision: _previousStageRevision,
    stageCount: _previousStageCount,
    ...questFields
  } = quest as Quest & RecordValue;
  const document = withoutUndefined({
    ...questFields,
    stageSchemaVersion: QUEST_STAGE_SCHEMA_VERSION,
    stageRevision,
    stageCount: quest.stages.length,
  }) as RecordValue;
  const stages = quest.stages.map(stage => withoutUndefined({
    ...stage,
    questId: quest.id,
    creatorId: quest.creatorId,
    stageRevision,
  }) as QuestStageDocument);
  return { document, stages };
}

export function storedQuestStageCount(document: RecordValue): number {
  if (document.stageSchemaVersion === QUEST_STAGE_SCHEMA_VERSION) {
    if (!Number.isInteger(document.stageCount) || !isFiniteNumber(document.stageCount, 0, MAX_QUEST_STAGES)) {
      throw new TypeError('Invalid stageCount on schema-v2 quest');
    }
    return document.stageCount as number;
  }
  if (!Array.isArray(document.stages) || document.stages.length > MAX_QUEST_STAGES) {
    throw new TypeError('Invalid legacy quest stages');
  }
  return document.stages.length;
}

export function questSummaryFromStorage(document: RecordValue): QuestSummary {
  const stageCount = storedQuestStageCount(document);
  const { stages: _stages, isPublic: _isPublic, stageSchemaVersion: _schema, stageRevision: _revision, stageCount: _count, ...quest } = document;
  return { ...(quest as unknown as Omit<Quest, 'stages'>), stageCount };
}

export function hydrateQuestFromStageStorage(document: RecordValue, stageDocuments: unknown[] = []): Quest {
  if (document.stageSchemaVersion !== QUEST_STAGE_SCHEMA_VERSION) {
    if (!Array.isArray(document.stages) || !document.stages.every(isValidQuestStage)) {
      throw new TypeError('Legacy quest contains invalid stages');
    }
    return document as unknown as Quest;
  }

  const stageCount = storedQuestStageCount(document);
  if (!isString(document.id, 128, 1) || !isString(document.creatorId, 128, 1) || !isString(document.stageRevision, 128, 20)) {
    throw new TypeError('Invalid schema-v2 quest stage metadata');
  }
  const current = stageDocuments.filter(candidate => isRecord(candidate)
    && candidate.questId === document.id
    && candidate.creatorId === document.creatorId
    && candidate.stageRevision === document.stageRevision);
  if (current.length !== stageCount) throw new TypeError('Incomplete schema-v2 quest stages');

  const stages = current.map(candidate => {
    const { questId: _questId, creatorId: _creatorId, stageRevision: _stageRevision, ...stage } = candidate as QuestStageDocument;
    if (!isValidQuestStage(stage)) throw new TypeError('Invalid schema-v2 quest stage payload');
    return stage;
  }).sort((a, b) => a.order - b.order);
  if (new Set(stages.map(stage => stage.id)).size !== stages.length
      || stages.some((stage, index) => stage.order !== index)) {
    throw new TypeError('Schema-v2 quest stages are not unique and contiguous');
  }

  const { stages: _legacy, isPublic: _isPublic, stageSchemaVersion: _schema, stageRevision: _revision, stageCount: _count, ...quest } = document;
  return { ...(quest as unknown as Omit<Quest, 'stages'>), stages };
}
