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
export interface QuestPedagogy {
  subject?: EducationSubject;
  grade?: EducationGrade;
  curriculumRef?: string;     // курикулумска тема/стандард, напр. „МАТ-6.3“
  learningGoals?: string[];   // цели на учење (макс 12, секоја до 200 знаци)
}

export const MAX_LEARNING_GOALS = 12;
export const MAX_LEARNING_GOAL_LENGTH = 200;

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
}

export interface InfoStage extends BaseStage {
  type: 'INFO';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'none';
}

export interface QuizStage extends BaseStage {
  type: 'QUIZ';
  questionType: 'multiple_choice' | 'free_text' | 'estimate_number';
  options?: string[];
  correctAnswer: string | number;
  timeLimitSeconds?: number;
  requiredToAdvance?: boolean;  // must answer correctly to proceed
  hintText?: string;
}

export interface MissionStage extends BaseStage {
  type: 'MISSION';
  submissionType: 'photo' | 'video' | 'audio';
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

export interface QuestResult {
  id: string;
  questId: string;
  playerName: string;
  points: number;
  completedAt: string;
  stageDurations?: { stageId: string; durationSec: number }[];
  teamCode?: string;
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
