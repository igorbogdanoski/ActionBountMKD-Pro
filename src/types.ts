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

export interface Coordinates {
  latitude: number;
  longitude: number;
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

  // Gameplay
  visibility: Visibility;
  playMode: PlayMode;
  sequence: SequenceType;
  publicResults?: boolean;   // whether results page is public
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
  | 'SURVEY'
  | 'TOURNAMENT';

export interface BaseStage {
  id: string;
  type: StageType;
  title: string;
  description: string;
  order: number;
  points?: number;
  audioUrl?: string;
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

export interface SurveyStage extends BaseStage {
  type: 'SURVEY';
  surveyQuestions: string[];
}

export interface TournamentStage extends BaseStage {
  type: 'TOURNAMENT';
  teamCount?: number;            // number of competing teams
  taskDescription?: string;      // what teams must do
  judgingMode?: 'points' | 'time' | 'manual';
}

export type Stage =
  | InfoStage
  | QuizStage
  | MissionStage
  | FindSpotStage
  | ScanCodeStage
  | SurveyStage
  | TournamentStage;

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

// ─── USER SETTINGS ────────────────────────────────────────────────────────────

export interface UserSettings {
  theme: 'dark' | 'light';
  updatedAt: string;
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
