import { useReducer, useCallback } from 'react';
import type {
  Quest, Stage, StageType,
  InfoStage, QuizStage, MissionStage,
  FindSpotStage, ScanCodeStage, SurveyStage, TournamentStage, SwitchStage,
} from '../../../types';

// ─── Action types ─────────────────────────────────────────────────────────────

export type EditorAction =
  | { type: 'LOAD_QUEST';        payload: Quest }
  | { type: 'SET_FIELD';         payload: { key: keyof Quest; value: unknown } }
  | { type: 'ADD_STAGE';         payload: { stageType: StageType; afterIndex?: number } }
  | { type: 'DUPLICATE_STAGE';   payload: { stageId: string } }
  | { type: 'DELETE_STAGE';      payload: { stageId: string } }
  | { type: 'UPDATE_STAGE';      payload: { stageId: string; updates: Partial<Stage> } }
  | { type: 'REORDER_STAGES';    payload: { oldIndex: number; newIndex: number } }
  | { type: 'SELECT_STAGE';      payload: string | null }
  | { type: 'SET_DIRTY' }
  | { type: 'SET_CLEAN' };

// ─── State ────────────────────────────────────────────────────────────────────

export interface EditorState {
  quest: Quest;
  selectedStageId: string | null;
  isDirty: boolean;
}

// ─── Default stage factories ──────────────────────────────────────────────────

function makeId(): string {
  // crypto.randomUUID is available in modern browsers and Node 19+
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2); }
}

function defaultStage(type: StageType, order: number): Stage {
  const base = { id: makeId(), title: '', description: '', order, points: 50 };

  switch (type) {
    case 'INFO':
      return { ...base, type: 'INFO', mediaType: 'none' } satisfies InfoStage;
    case 'QUIZ':
      return { ...base, type: 'QUIZ', questionType: 'free_text', correctAnswer: '', requiredToAdvance: false } satisfies QuizStage;
    case 'MISSION':
      return { ...base, type: 'MISSION', submissionType: 'photo' } satisfies MissionStage;
    case 'FIND_SPOT':
      return { ...base, type: 'FIND_SPOT', targetCoordinates: { latitude: 41.9981, longitude: 21.4254 }, radiusMeters: 30, showMode: 'map', requiredToAdvance: true } satisfies FindSpotStage;
    case 'SCAN_CODE':
      return { ...base, type: 'SCAN_CODE', targetQrPayload: '' } satisfies ScanCodeStage;
    case 'SURVEY':
      return { ...base, type: 'SURVEY', surveyQuestions: [''] } satisfies SurveyStage;
    case 'TOURNAMENT':
      return { ...base, type: 'TOURNAMENT', teamCount: 2, judgingMode: 'points' } satisfies TournamentStage;
    case 'SWITCH':
      return {
        ...base,
        type: 'SWITCH',
        points: 0,
        conditions: [{ id: makeId(), label: '', targetStageId: '' }],
        defaultTargetStageId: '',
        showPathsToPlayer: false,
      } satisfies SwitchStage;
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reorderStages(stages: Stage[]): Stage[] {
  return stages.map((s, i) => ({ ...s, order: i }));
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_QUEST':
      return { quest: action.payload, selectedStageId: null, isDirty: false };

    case 'SET_FIELD':
      return {
        ...state,
        isDirty: true,
        quest: { ...state.quest, [action.payload.key]: action.payload.value },
      };

    case 'ADD_STAGE': {
      const newStage = defaultStage(action.payload.stageType, 0);
      const after = action.payload.afterIndex ?? state.quest.stages.length - 1;
      const stages = [...state.quest.stages];
      stages.splice(after + 1, 0, newStage);
      return {
        ...state,
        isDirty: true,
        selectedStageId: newStage.id,
        quest: { ...state.quest, stages: reorderStages(stages) },
      };
    }

    case 'DUPLICATE_STAGE': {
      const idx = state.quest.stages.findIndex(s => s.id === action.payload.stageId);
      if (idx === -1) return state;
      const copy = { ...state.quest.stages[idx], id: makeId() };
      const stages = [...state.quest.stages];
      stages.splice(idx + 1, 0, copy);
      return {
        ...state,
        isDirty: true,
        selectedStageId: copy.id,
        quest: { ...state.quest, stages: reorderStages(stages) },
      };
    }

    case 'DELETE_STAGE': {
      const stages = state.quest.stages.filter(s => s.id !== action.payload.stageId);
      const wasSelected = state.selectedStageId === action.payload.stageId;
      return {
        ...state,
        isDirty: true,
        selectedStageId: wasSelected ? (stages[0]?.id ?? null) : state.selectedStageId,
        quest: { ...state.quest, stages: reorderStages(stages) },
      };
    }

    case 'UPDATE_STAGE': {
      const stages = state.quest.stages.map(s =>
        s.id === action.payload.stageId ? { ...s, ...action.payload.updates } as Stage : s,
      );
      return { ...state, isDirty: true, quest: { ...state.quest, stages } };
    }

    case 'REORDER_STAGES': {
      const stages = [...state.quest.stages];
      const [moved] = stages.splice(action.payload.oldIndex, 1);
      stages.splice(action.payload.newIndex, 0, moved);
      return {
        ...state,
        isDirty: true,
        quest: { ...state.quest, stages: reorderStages(stages) },
      };
    }

    case 'SELECT_STAGE':
      return { ...state, selectedStageId: action.payload };

    case 'SET_DIRTY':
      return { ...state, isDirty: true };

    case 'SET_CLEAN':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuestEditor(initial: Quest) {
  const [state, dispatch] = useReducer(reducer, {
    quest: initial,
    selectedStageId: initial.stages[0]?.id ?? null,
    isDirty: false,
  });

  const setField   = useCallback(<K extends keyof Quest>(key: K, value: Quest[K]) =>
    dispatch({ type: 'SET_FIELD', payload: { key, value: value as unknown } }), []);

  const addStage   = useCallback((stageType: StageType, afterIndex?: number) =>
    dispatch({ type: 'ADD_STAGE', payload: { stageType, afterIndex } }), []);

  const dupStage   = useCallback((stageId: string) =>
    dispatch({ type: 'DUPLICATE_STAGE', payload: { stageId } }), []);

  const delStage   = useCallback((stageId: string) =>
    dispatch({ type: 'DELETE_STAGE', payload: { stageId } }), []);

  const updateStage = useCallback((stageId: string, updates: Partial<Stage>) =>
    dispatch({ type: 'UPDATE_STAGE', payload: { stageId, updates } }), []);

  const reorder    = useCallback((oldIndex: number, newIndex: number) =>
    dispatch({ type: 'REORDER_STAGES', payload: { oldIndex, newIndex } }), []);

  const select     = useCallback((id: string | null) =>
    dispatch({ type: 'SELECT_STAGE', payload: id }), []);

  const load       = useCallback((q: Quest) =>
    dispatch({ type: 'LOAD_QUEST', payload: q }), []);

  const setClean   = useCallback(() => dispatch({ type: 'SET_CLEAN' }), []);

  return { state, setField, addStage, dupStage, delStage, updateStage, reorder, select, load, setClean };
}
