export type Visibility = 'public' | 'secret';
export type PlayMode = 'singleplayer' | 'multiplayer';
export type SequenceType = 'fixed' | 'random' | 'selectable';

export interface Collaborator {
  email: string;
  role: 'viewer' | 'editor';
}

export interface Quest {
  id: string;
  creatorId: string;
  collaborators?: Collaborator[];
  title: string;
  description: string;
  coverImage?: string;
  visibility: Visibility;
  playMode: PlayMode;
  sequence: SequenceType;
  mapStyle?: string;
  startCoordinates?: Coordinates;
  destinationCoordinates?: Coordinates;
  createdAt: string;
  updatedAt: string;
  stages: Stage[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type StageType = 'INFO' | 'QUIZ' | 'MISSION' | 'FIND_SPOT' | 'SCAN_CODE' | 'SURVEY';

export interface BaseStage {
  id: string;
  type: StageType;
  title: string;
  description: string;
  order: number;
  points?: number; // Gamification points
  audioUrl?: string;
}

export interface InfoStage extends BaseStage {
  type: 'INFO';
  mediaUrl?: string; // Image or video URL
  mediaType?: 'image' | 'video' | 'none';
}

export interface QuizStage extends BaseStage {
  type: 'QUIZ';
  questionType: 'multiple_choice' | 'free_text' | 'estimate_number';
  options?: string[]; // For multiple choice
  correctAnswer: string | number; 
  timeLimitSeconds?: number;
}

export interface MissionStage extends BaseStage {
  type: 'MISSION';
  submissionType: 'photo' | 'video' | 'audio';
}

export interface FindSpotStage extends BaseStage {
  type: 'FIND_SPOT';
  targetCoordinates: Coordinates;
  radiusMeters: number; // How close they need to be
  mapIcon?: string;
}

export interface ScanCodeStage extends BaseStage {
  type: 'SCAN_CODE';
  targetQrPayload: string; // The text/ID the QR code should contain
}

export interface SurveyStage extends BaseStage {
  type: 'SURVEY';
  surveyQuestions: string[];
}

export type Stage = InfoStage | QuizStage | MissionStage | FindSpotStage | ScanCodeStage | SurveyStage;

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
  free:       { maxQuests: 3,   maxStagesPerQuest: 10, maxPlayersPerQuest: 20,   canExportCSV: false, canCollaborate: false, canUseAI: false, canGoPublic: false },
  starter:    { maxQuests: 15,  maxStagesPerQuest: 30, maxPlayersPerQuest: 100,  canExportCSV: true,  canCollaborate: false, canUseAI: true,  canGoPublic: true  },
  pro:        { maxQuests: 100, maxStagesPerQuest: 80, maxPlayersPerQuest: 500,  canExportCSV: true,  canCollaborate: true,  canUseAI: true,  canGoPublic: true  },
  enterprise: { maxQuests: -1,  maxStagesPerQuest: -1, maxPlayersPerQuest: -1,   canExportCSV: true,  canCollaborate: true,  canUseAI: true,  canGoPublic: true  },
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
