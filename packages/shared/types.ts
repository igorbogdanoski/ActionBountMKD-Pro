// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

export type Visibility   = 'public' | 'secret';
export type PlayMode     = 'singleplayer' | 'multiplayer';
export type SequenceType = 'fixed' | 'random' | 'selectable';

export type QuestCategory =
  | 'educational'
  | 'cultural'
  | 'teambuilding'
  | 'tourism'
  | 'personal'
  | 'other';

export const QUEST_CATEGORY_LABELS: Record<QuestCategory, string> = {
  educational:  'Образование',
  cultural:     'Култура',
  teambuilding: 'Тим-градење',
  tourism:      'Туризам',
  personal:     'Лично',
  other:        'Друго',
};

export interface Collaborator {
  email: string;
  role: 'viewer' | 'editor';
}

// ─── PEDAGOGY (Phase 7D) ──────────────────────────────────────────────────────

export type EducationSubject =
  | 'Математика'
  | 'Природни науки'
  | 'Биологија'
  | 'Хемија'
  | 'Физика'
  | 'Географија'
  | 'Историја'
  | 'Мајчин јазик'
  | 'Странски јазик'
  | 'Физичко и здравствено'
  | 'Информатика'
  | 'Техничко образование'
  | 'Уметност'
  | 'Граѓанско образование'
  | 'Друго';

export const EDUCATION_SUBJECTS: EducationSubject[] = [
  'Математика',
  'Природни науки',
  'Биологија',
  'Хемија',
  'Физика',
  'Географија',
  'Историја',
  'Мајчин јазик',
  'Странски јазик',
  'Физичко и здравствено',
  'Информатика',
  'Техничко образование',
  'Уметност',
  'Граѓанско образование',
  'Друго',
];

export type EducationGrade =
  | 'Предучилишно'
  | '1 одд.'
  | '2 одд.'
  | '3 одд.'
  | '4 одд.'
  | '5 одд.'
  | '6 одд.'
  | '7 одд.'
  | '8 одд.'
  | '9 одд.'
  | 'Средно'
  | 'Возрасни'
  | 'Сите';

export const EDUCATION_GRADES: EducationGrade[] = [
  'Предучилишно',
  '1 одд.',
  '2 одд.',
  '3 одд.',
  '4 одд.',
  '5 одд.',
  '6 одд.',
  '7 одд.',
  '8 одд.',
  '9 одд.',
  'Средно',
  'Возрасни',
  'Сите',
];

/** Pedagogical metadata that turns a quest into a real teaching unit. */
export interface LearningObjective {
  /** Stable opaque identity; labels may be renamed without breaking mappings. */
  id: string;
  label: string;
}

export interface QuestPedagogy {
  subject?: EducationSubject;
  grade?: EducationGrade;
  curriculumRef?: string;     // курикулумска тема/стандард, напр. „МАТ-6.3“
  learningGoals?: string[];   // цели на учење (макс 12, секоја до 200 знаци)
  /** Stable objective model; learningGoals remains readable for legacy quests. */
  learningObjectives?: LearningObjective[];
}

export const MAX_LEARNING_GOALS = 12;
export const MAX_LEARNING_GOAL_LENGTH = 200;
export const MAX_OBJECTIVE_ID_LENGTH = 64;

/** Filter by pedagogical subject / grade. Empty fields mean "no constraint". Pure. */
export interface PedagogyFilter {
  subject?: EducationSubject | '';
  grade?: EducationGrade | '';
}

/** Whether a quest matches the given subject/grade filter. A quest with grade
 *  „Сите" matches any grade constraint. Pure & side-effect free. */
export function questMatchesPedagogy(
  quest: Pick<Quest, 'pedagogy'> | null | undefined,
  filter: PedagogyFilter,
): boolean {
  const subject = filter.subject?.trim();
  const grade = filter.grade?.trim();
  if (subject && quest?.pedagogy?.subject !== subject) return false;
  if (grade && quest?.pedagogy?.grade !== grade && quest?.pedagogy?.grade !== 'Сите') return false;
  return true;
}

// ─── RUBRICS (Phase 7D-2) ─────────────────────────────────────────────────────

/** A single achievement level within a rubric criterion (e.g. „Одлично" = 4 поени). */
export interface RubricLevel {
  id: string;
  label: string;       // напр. „Одлично", „Делумно", „Недоволно"
  points: number;      // поени доделени за ова ниво
  descriptor?: string; // што се бара за ова ниво
}

/** A scoring dimension teachers grade a manual submission against. */
export interface RubricCriterion {
  id: string;
  title: string;       // напр. „Точност", „Креативност"
  levels: RubricLevel[];
}

/** Rubric attached to manually-graded stages (MISSION/SURVEY). */
export interface Rubric {
  criteria: RubricCriterion[];
  feedbackPresets?: string[]; // брзи фрази за насочена повратна информација
}

export const MAX_RUBRIC_CRITERIA = 8;
export const MAX_RUBRIC_LEVELS = 5;
export const MAX_FEEDBACK_PRESETS = 12;

/** Sum of the highest level points across all criteria — the rubric's max score. */
export function rubricMaxPoints(rubric?: Rubric | null): number {
  if (!rubric?.criteria?.length) return 0;
  return rubric.criteria.reduce((sum, c) => {
    const best = (c.levels ?? []).reduce((m, l) => Math.max(m, l.points || 0), 0);
    return sum + best;
  }, 0);
}

// ─── CLASS GROUPS (Phase 7D-3) ────────────────────────────────────────────────

/** A single student inside a teacher's class group. */
export interface GroupStudent {
  id: string;
  name: string;
  note?: string;   // опц. белешка (напр. „треба поддршка")
}

/** A named class / group of students a teacher can assign adventures to. */
export interface ClassGroup {
  id: string;
  ownerId: string;            // наставник (creator) — сопственик
  name: string;               // напр. „6-в одделение"
  description?: string;
  students: GroupStudent[];
  assignedQuestIds?: string[]; // авантури доделени на оваа група
  createdAt: string;
  updatedAt: string;
}

export const MAX_GROUP_STUDENTS = 60;
export const MAX_GROUP_NAME_LENGTH = 80;
export const MAX_STUDENT_NAME_LENGTH = 80;

/** Number of adventures assigned to a group. */
export function groupAssignedCount(group?: ClassGroup | null): number {
  return group?.assignedQuestIds?.length ?? 0;
}

/** Case-insensitive, whitespace-tolerant check whether a student name already exists. */
export function isStudentNameTaken(group: Pick<ClassGroup, 'students'> | null | undefined, name: string): boolean {
  const norm = name.trim().toLowerCase();
  if (!norm) return false;
  return (group?.students ?? []).some(s => s.name.trim().toLowerCase() === norm);
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon?: string;
  mediaUrl?: string;
}

// ─── QUEST ────────────────────────────────────────────────────────────────────

export interface Quest {
  id: string;
  creatorId: string;
  collaborators?: Collaborator[];

  // Content
  title: string;
  description: string;
  coverImage?: string;
  category?: QuestCategory;
  tags?: string[];           // max 10, each max 30 chars
  pedagogy?: QuestPedagogy;  // learning goals, subject, grade, curriculum (Phase 7D)

  // Gameplay
  visibility: Visibility;
  playMode: PlayMode;
  sequence: SequenceType;
  publicResults?: boolean;   // whether results page is public
  publicLeaderboard?: boolean; // whether a live leaderboard page is public (Pro+)
  certificateEnabled?: boolean;   // offer a downloadable PDF certificate on finish (default on)
  certificateWatermark?: boolean; // Free plan certificates carry a watermark; Starter+ are clean
  playingTimeMinutes?: number;

  // Structure
  hasIntro?: boolean;        // first stage is a non-scoring intro
  hasOutro?: boolean;        // last stage is a non-scoring outro
  stages: Stage[];

  // Geography
  mapStyle?: string;
  startCoordinates?: Coordinates;
  destinationCoordinates?: Coordinates;
  boundLengthKm?: number;    // auto-calculated or manual
  track?: Coordinates[];     // route polyline parsed from a GPX/KML upload
  trackName?: string;        // original uploaded file name

  // Inventory
  inventoryItems?: InventoryItem[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ─── STAGES ───────────────────────────────────────────────────────────────────

export type StageType =
  | 'INFO'
  | 'QUIZ'
  | 'MISSION'
  | 'FIND_SPOT'
  | 'SCAN_CODE'
  | 'QR_TASK'
  | 'SURVEY'
  | 'TOURNAMENT'
  | 'SWITCH';

export interface BaseStage {
  id: string;
  type: StageType;
  title: string;
  description: string;
  order: number;
  points?: number;
  audioUrl?: string;
  grantsItemId?: string;
  requiresItemId?: string;
  isIntro?: boolean;   // special non-scoring intro stage
  isOutro?: boolean;   // special non-scoring outro stage
  /** Stable reference to QuestPedagogy.learningObjectives[].id. */
  objectiveRef?: string;
}

export interface ObjectiveCoverage {
  objective: LearningObjective;
  stageIds: string[];
  mappedStageCount: number;
  mappedPoints: number;
}

export interface QuestObjectiveCoverage {
  objectives: ObjectiveCoverage[];
  unmappedStageIds: string[];
  missingObjectiveRefs: string[];
}

/**
 * Aggregate stage coverage by stable objective id. Labels are display-only:
 * renamed or duplicate labels never change mappings. Unknown references are
 * reported instead of silently counted, and legacy unmapped stages remain valid.
 */
export function computeObjectiveCoverage(
  objectives: LearningObjective[],
  stages: BaseStage[],
): QuestObjectiveCoverage {
  const objectiveById = new Map<string, LearningObjective>();
  for (const objective of objectives) {
    if (!objectiveById.has(objective.id)) objectiveById.set(objective.id, objective);
  }

  const stageIdsByObjective = new Map<string, string[]>();
  const pointsByObjective = new Map<string, number>();
  const unmappedStageIds: string[] = [];
  const missingObjectiveRefs = new Set<string>();

  for (const stage of stages) {
    if (!stage.objectiveRef) {
      unmappedStageIds.push(stage.id);
      continue;
    }
    if (!objectiveById.has(stage.objectiveRef)) {
      missingObjectiveRefs.add(stage.objectiveRef);
      continue;
    }
    stageIdsByObjective.set(stage.objectiveRef, [
      ...(stageIdsByObjective.get(stage.objectiveRef) ?? []),
      stage.id,
    ]);
    pointsByObjective.set(
      stage.objectiveRef,
      (pointsByObjective.get(stage.objectiveRef) ?? 0) + (stage.points ?? 0),
    );
  }

  return {
    objectives: [...objectiveById.values()].map(objective => {
      const stageIds = stageIdsByObjective.get(objective.id) ?? [];
      return {
        objective,
        stageIds,
        mappedStageCount: stageIds.length,
        mappedPoints: pointsByObjective.get(objective.id) ?? 0,
      };
    }),
    unmappedStageIds,
    missingObjectiveRefs: [...missingObjectiveRefs],
  };
}

export interface InfoStage extends BaseStage {
  type: 'INFO';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'none';
}

/** One left/right pair for a 'matching' QUIZ question — id binds the pair together. */
export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

/** One item for an 'ordering' QUIZ question — array order is the correct sequence. */
export interface OrderingItem {
  id: string;
  text: string;
}

export interface QuizStage extends BaseStage {
  type: 'QUIZ';
  questionType: 'multiple_choice' | 'free_text' | 'estimate_number' | 'matching' | 'ordering';
  options?: string[];
  correctAnswer: string | number;
  matchingPairs?: MatchingPair[];   // for questionType: 'matching'
  orderingItems?: OrderingItem[];   // for questionType: 'ordering'
  timeLimitSeconds?: number;
  requiredToAdvance?: boolean;  // must answer correctly to proceed
  hintText?: string;
}

/** A 'matching' answer is correct only once every pair is matched to its own right side. */
export function isMatchingCorrect(pairs: MatchingPair[], selections: Record<string, string>): boolean {
  return pairs.length > 0 && pairs.every(p => selections[p.id] === p.right);
}

/** An 'ordering' answer is correct only once the sequence exactly matches item order. */
export function isOrderingCorrect(items: OrderingItem[], sequence: string[]): boolean {
  if (items.length === 0 || sequence.length !== items.length) return false;
  return items.every((item, i) => sequence[i] === item.id);
}

export interface MissionStage extends BaseStage {
  type: 'MISSION';
  submissionType: 'photo' | 'video' | 'audio';
  rubric?: Rubric;   // scoring rubric + directed feedback (Phase 7D-2)
}

export type FindSpotShowMode = 'map' | 'arrow' | 'none';

export interface FindSpotStage extends BaseStage {
  type: 'FIND_SPOT';
  targetCoordinates: Coordinates;
  radiusMeters: number;
  mapIcon?: string;
  showMode?: FindSpotShowMode;   // how to guide the player
  requiredToAdvance?: boolean;
}

export interface ScanCodeStage extends BaseStage {
  type: 'SCAN_CODE';
  targetQrPayload: string;
}

export type QrTaskAnswerType = 'text' | 'photo' | 'multiple_choice';

export interface QrTaskStage extends BaseStage {
  type: 'QR_TASK';
  targetQrPayload: string;       // QR код за скенирање
  taskTitle: string;             // Наслов на задачата (се прикажува ПОСЛЕ скенирање)
  taskDescription: string;       // Прашање/задача (се прикажува ПОСЛЕ скенирање)
  taskMediaUrl?: string;         // Опционална слика кон задачата
  answerType: QrTaskAnswerType;  // Тип на одговор
  options?: string[];            // За multiple_choice
  correctAnswer?: string;        // За автоматско оценување (празно = рачно)
  requiredToAdvance: boolean;
}

export interface SurveyStage extends BaseStage {
  type: 'SURVEY';
  surveyQuestions: string[];
  rubric?: Rubric;   // scoring rubric + directed feedback (Phase 7D-2)
}

export interface TournamentStage extends BaseStage {
  type: 'TOURNAMENT';
  teamCount?: number;
  taskDescription?: string;
  judgingMode?: 'points' | 'time' | 'manual';
}

export interface SwitchCondition {
  id: string;
  label: string;               // e.g. 'Ако имаш повеќе од 50 поени'
  minPoints?: number;
  maxPoints?: number;
  requiredStageIds?: string[]; // all listed stages must be completed
  requiredItemId?: string;
  targetStageId: string;       // jump to this stage if condition matches
}

export interface SwitchStage extends BaseStage {
  type: 'SWITCH';
  conditions: SwitchCondition[];
  defaultTargetStageId?: string; // fallback when no condition matches
  showPathsToPlayer: boolean;    // show branching choices or auto-route silently
}

export type Stage =
  | InfoStage
  | QuizStage
  | MissionStage
  | FindSpotStage
  | ScanCodeStage
  | QrTaskStage
  | SurveyStage
  | TournamentStage
  | SwitchStage;

// ─── TEMPLATE ─────────────────────────────────────────────────────────────────

export type TemplateSubject =
  | 'Математика'
  | 'Природни науки'
  | 'Јазици'
  | 'Историја'
  | 'Физичко'
  | 'Уметност'
  | 'Останато';

export type TemplateDifficulty = 'лесно' | 'средно' | 'тешко';
export type TemplateStatus = 'pending' | 'approved' | 'rejected';

export interface Template {
  id: string;
  title: string;
  subject: TemplateSubject;
  grade: string;              // '6 одд.' | '7-8 одд.' | 'Сите'
  curriculumRef?: string;     // курикулумска тема/стандард, напр. „МАТ-6.3" (Phase 2 — институционална усогласеност)
  description: string;
  stages: Stage[];            // full stage data — copied on use
  stageCount: number;
  rating: number;
  ratingCount: number;
  authorId: string;
  authorName: string;
  status: TemplateStatus;
  isPublic: boolean;
  isFeatured: boolean;        // admin-curated highlight
  isPro: boolean;             // requires Pro plan to use
  difficulty: TemplateDifficulty;
  estimatedMinutes: number;
  playMode: PlayMode;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── QUEST RESULT ─────────────────────────────────────────────────────────────

/** A student's raw answer to a manually-graded (MISSION/SURVEY) stage. */
export interface StageSubmission {
  stageId: string;
  type: 'photo' | 'video' | 'audio' | 'survey';
  mediaUrl?: string;          // Storage download URL — MISSION photo/video/audio
  surveyAnswers?: string[];   // free-text answers, indexed to match surveyQuestions
}

/** A teacher's rubric-based grade for one submission. */
export interface RubricGrade {
  stageId: string;
  criterionScores: Record<string, number>; // RubricCriterion.id -> awarded points
  totalPoints: number;
  feedback?: string;
  gradedAt: string;
}

/** A player's first-attempt answer to a QUIZ stage — powers per-question analytics. */
export interface QuizAnswerRecord {
  stageId: string;
  selectedAnswer: string;
  correct: boolean;
}

export interface QuestResult {
  id: string;
  questId: string;
  /** Client-generated idempotency key; legacy results may not have one. */
  attemptId?: string;
  /** Stable class-roster identity when the player was launched as a roster student. */
  studentId?: string;
  playerName: string;
  points: number;
  completedAt: string;
  stageDurations?: { stageId: string; durationSec: number }[];
  teamCode?: string;
  submissions?: StageSubmission[];
  grades?: RubricGrade[];
  /** Teacher approval metadata; never supplied by a player result create. */
  approvedAt?: string;
  approvedBy?: string;
  quizAnswers?: QuizAnswerRecord[];
}

export type ResultSelectionPolicy = 'first' | 'latest' | 'best' | 'teacher-approved';
export const DEFAULT_RESULT_SELECTION_POLICY: ResultSelectionPolicy = 'best';

export interface NumberedQuestResult {
  result: QuestResult;
  attemptNumber: number;
}

export function createAttemptId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return randomUuid;
  return `attempt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Derive display attempt numbers without a race-prone stored counter. */
export function numberQuestAttempts(results: QuestResult[]): NumberedQuestResult[] {
  return [...results]
    .sort((left, right) => {
      const byTime = Date.parse(left.completedAt) - Date.parse(right.completedAt);
      if (byTime !== 0) return byTime;
      return (left.attemptId ?? left.id).localeCompare(right.attemptId ?? right.id);
    })
    .map((result, index) => ({ result, attemptNumber: index + 1 }));
}

function resultTimestamp(result: QuestResult): number {
  const timestamp = Date.parse(result.completedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function resultStableId(result: QuestResult): string {
  return result.attemptId ?? result.id;
}

export function selectQuestResult(
  results: QuestResult[],
  policy: ResultSelectionPolicy = DEFAULT_RESULT_SELECTION_POLICY,
): QuestResult | null {
  const candidates = policy === 'teacher-approved'
    ? results.filter(result => Boolean(result.approvedAt))
    : results;
  if (candidates.length === 0) return null;

  return [...candidates].sort((left, right) => {
    if (policy === 'best') {
      const byPoints = right.points - left.points;
      if (byPoints !== 0) return byPoints;
    }
    const byTime = resultTimestamp(left) - resultTimestamp(right);
    if (byTime !== 0) return policy === 'first' ? byTime : -byTime;
    const byId = resultStableId(left).localeCompare(resultStableId(right));
    return policy === 'first' ? byId : -byId;
  })[0];
}

// ─── GRADEBOOK (Phase 7D-4) ───────────────────────────────────────────────────

export interface GradeCell {
  questId: string;
  points: number | null;     // null = ученикот сè уште не ја завршил авантурата
  completedAt: string | null;
}

export interface GradeRow {
  studentId: string;
  studentName: string;
  cells: GradeCell[];
  total: number;             // збир од најдобри поени по авантура
  completedCount: number;
}

/** Total available points across all stages of a quest. */
export function questMaxScore(quest: Pick<Quest, 'stages'> | null | undefined): number {
  return (quest?.stages ?? []).reduce((sum, s) => sum + (s.points || 0), 0);
}

/** Normalize a player/student name for tolerant matching. */
export function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The highest-scoring result for a given player name within a result list. */
export function bestResultForName(results: QuestResult[], name: string): QuestResult | null {
  const norm = normalizePlayerName(name);
  if (!norm) return null;
  return selectQuestResult(
    results.filter(result =>
      !result.studentId && normalizePlayerName(result.playerName) === norm
    ),
    'best',
  );
}

/**
 * Prefer stable roster identity while retaining name matching for legacy
 * results that predate `studentId`. Results assigned to another stable ID are
 * never borrowed merely because the display name matches.
 */
export function bestResultForStudent(
  results: QuestResult[],
  student: Pick<GroupStudent, 'id' | 'name'>,
): QuestResult | null {
  return selectResultForStudent(results, student, 'best');
}

export function selectResultForStudent(
  results: QuestResult[],
  student: Pick<GroupStudent, 'id' | 'name'>,
  policy: ResultSelectionPolicy = DEFAULT_RESULT_SELECTION_POLICY,
): QuestResult | null {
  const normalizedName = normalizePlayerName(student.name);
  const candidates = results.filter(result => {
    const stableMatch = result.studentId === student.id;
    const legacyNameMatch =
      !result.studentId &&
      normalizedName.length > 0 &&
      normalizePlayerName(result.playerName) === normalizedName;
    return stableMatch || legacyNameMatch;
  });
  return selectQuestResult(candidates, policy);
}

/** Build a per-student gradebook across a set of adventures. Pure. */
export function buildClassGradebook(
  students: Pick<GroupStudent, 'id' | 'name'>[],
  questIds: string[],
  resultsByQuest: Record<string, QuestResult[]>,
  policy: ResultSelectionPolicy = DEFAULT_RESULT_SELECTION_POLICY,
): GradeRow[] {
  return students.map(s => {
    const cells: GradeCell[] = questIds.map(qid => {
      const selected = selectResultForStudent(resultsByQuest[qid] ?? [], s, policy);
      return {
        questId: qid,
        points: selected ? selected.points : null,
        completedAt: selected ? selected.completedAt : null,
      };
    });
    const total = cells.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const completedCount = cells.filter(c => c.points !== null).length;
    return { studentId: s.id, studentName: s.name, cells, total, completedCount };
  });
}

// ─── OBJECTIVE MASTERY (Phase H7-4) ───────────────────────────────────────────

export interface ObjectiveMastery {
  objective: LearningObjective;
  mappedStageCount: number;
  reachedStageCount: number;
  /** null when the objective has no mapped stages — mastery is undefined, not zero. */
  masteryRatio: number | null;
}

export interface QuestObjectiveMastery {
  objectives: ObjectiveMastery[];
}

/**
 * Per-student objective mastery from a single resolved attempt. Mastery is the
 * share of an objective's mapped stages the student reached (present in
 * `stageDurations`) — a cross-stage-type completion signal, not per-answer
 * correctness. Pure; reuses `computeObjectiveCoverage`'s stable-id mapping.
 */
export function computeObjectiveMastery(
  objectives: LearningObjective[],
  stages: BaseStage[],
  result: Pick<QuestResult, 'stageDurations'> | null | undefined,
): QuestObjectiveMastery {
  const reachedStageIds = new Set((result?.stageDurations ?? []).map(d => d.stageId));
  const coverage = computeObjectiveCoverage(objectives, stages);
  return {
    objectives: coverage.objectives.map(item => {
      const reachedStageCount = item.stageIds.filter(id => reachedStageIds.has(id)).length;
      return {
        objective: item.objective,
        mappedStageCount: item.mappedStageCount,
        reachedStageCount,
        masteryRatio: item.mappedStageCount > 0 ? reachedStageCount / item.mappedStageCount : null,
      };
    }),
  };
}

export interface StudentObjectiveMastery {
  studentId: string;
  studentName: string;
  objectives: ObjectiveMastery[];
}

/**
 * Per-roster-student objective mastery for one quest, using the same stable-ID-first
 * / legacy-name-fallback attempt resolution as `buildClassGradebook`. Pure.
 */
export function buildObjectiveMasteryReport(
  students: Pick<GroupStudent, 'id' | 'name'>[],
  objectives: LearningObjective[],
  stages: BaseStage[],
  results: QuestResult[],
  policy: ResultSelectionPolicy = DEFAULT_RESULT_SELECTION_POLICY,
): StudentObjectiveMastery[] {
  return students.map(student => {
    const selected = selectResultForStudent(results, student, policy);
    return {
      studentId: student.id,
      studentName: student.name,
      objectives: computeObjectiveMastery(objectives, stages, selected).objectives,
    };
  });
}

// ─── QUEST FEEDBACK ───────────────────────────────────────────────────────────

export interface QuestFeedback {
  id: string;
  questId: string;
  playerName: string;
  comment: string;
  points: number;
  createdAt: string;
}

// ─── REAL-TIME GAME SESSION (Phase 5A) ────────────────────────────────────────

export type SessionStatus = 'waiting' | 'active' | 'finished';
export type SessionMode   = 'free' | 'broadcast';

export interface SessionPlayer {
  uid: string;          // anonymous client id (not a Firebase auth uid required)
  name: string;
  points: number;
  stageIndex: number;   // current stage the player is on
  finished: boolean;
  lastLat?: number;
  lastLng?: number;
  lastSeenAt?: string;
  joinedAt: string;
  updatedAt: string;
  // Host-granted timed-stage accommodation (e.g. 1.5 = +50% time on QUIZ
  // countdowns). Lives on the session, not the student's profile — an
  // explicit, per-session grant instead of a persisted "needs support" flag.
  timeMultiplier?: number;
}

export interface SessionSosAlert {
  playerId: string;
  lat: number;
  lng: number;
  ts: string;
}

export interface GameSession {
  id: string;                 // 6-char join code (also the Firestore doc id)
  questId: string;
  questTitle: string;
  hostId: string;             // Firebase auth uid of the host
  players: SessionPlayer[];
  sosAlerts: SessionSosAlert[];
  status: SessionStatus;
  mode: SessionMode;          // 'free' = self-paced, 'broadcast' = host-paced
  currentStageIndex: number;  // broadcast pointer
  stageCount: number;
  maxPlayers: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry extends SessionPlayer {
  rank: number;
}

// ─── USER SETTINGS ────────────────────────────────────────────────────────────

export interface UserSettings {
  theme: 'dark' | 'light';
  updatedAt: string;
  notificationsEnabled?: boolean;
  notificationPermissionStatus?: 'granted' | 'denied' | 'undetermined' | 'unsupported' | 'simulator';
  expoPushToken?: string | null;
  notificationPlatform?: 'android' | 'ios' | 'web';
  notificationError?: string | null;
}

// ─── SAAS: USER PROFILE & PLANS ───────────────────────────────────────────────

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxQuests: number;
  maxStagesPerQuest: number;
  maxPlayersPerQuest: number;
  canExportCSV: boolean;
  canCollaborate: boolean;
  canUseAI: boolean;
  canGoPublic: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:       { maxQuests: 3,   maxStagesPerQuest: 10, maxPlayersPerQuest: 20,  canExportCSV: false, canCollaborate: false, canUseAI: false, canGoPublic: false },
  starter:    { maxQuests: 15,  maxStagesPerQuest: 30, maxPlayersPerQuest: 100, canExportCSV: true,  canCollaborate: false, canUseAI: true,  canGoPublic: true  },
  pro:        { maxQuests: 100, maxStagesPerQuest: 80, maxPlayersPerQuest: 500, canExportCSV: true,  canCollaborate: true,  canUseAI: true,  canGoPublic: true  },
  enterprise: { maxQuests: -1,  maxStagesPerQuest: -1, maxPlayersPerQuest: -1,  canExportCSV: true,  canCollaborate: true,  canUseAI: true,  canGoPublic: true  },
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: PlanId;
  subscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}
