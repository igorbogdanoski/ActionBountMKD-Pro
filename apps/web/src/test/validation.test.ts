import { describe, it, expect } from 'vitest';
import {
  QuestMetaSchema,
  InventoryItemSchema,
  PlayerNameSchema,
  QuestResultSchema,
  FeedbackSchema,
  CollaboratorEmailSchema,
  FindSpotStageSchema,
  QuizStageSchema,
  SurveyStageSchema,
  ScanCodeStageSchema,
} from '../lib/validation';

// ─── Quest Meta ───────────────────────────────────────────────────────────────

describe('QuestMetaSchema', () => {
  it('accepts valid quest metadata', () => {
    const result = QuestMetaSchema.safeParse({
      title: 'Скопска авантура',
      description: 'Истражи ја Старата Чаршија',
      visibility: 'public',
      playMode: 'singleplayer',
      sequence: 'fixed',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = QuestMetaSchema.safeParse({
      title: '',
      description: 'test',
      visibility: 'public',
      playMode: 'singleplayer',
      sequence: 'fixed',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 200 chars', () => {
    const result = QuestMetaSchema.safeParse({
      title: 'a'.repeat(201),
      description: 'test',
      visibility: 'public',
      playMode: 'singleplayer',
      sequence: 'fixed',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid visibility value', () => {
    const result = QuestMetaSchema.safeParse({
      title: 'Test',
      description: 'test',
      visibility: 'hidden',         // invalid
      playMode: 'singleplayer',
      sequence: 'fixed',
    });
    expect(result.success).toBe(false);
  });
});

describe('InventoryItemSchema', () => {
  it('accepts a valid inventory item', () => {
    expect(InventoryItemSchema.safeParse({
      id: 'mapa',
      name: 'Мапа',
      icon: '🗺️',
      mediaUrl: 'https://example.com/map.png',
    }).success).toBe(true);
  });

  it('rejects empty id', () => {
    expect(InventoryItemSchema.safeParse({ id: '', name: 'Мапа' }).success).toBe(false);
  });

  it('strips html from item name', () => {
    const result = InventoryItemSchema.safeParse({ id: 'mapa', name: '<script>x</script>Мапа' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Мапа');
    }
  });

  it('rejects invalid mediaUrl', () => {
    expect(InventoryItemSchema.safeParse({ id: 'mapa', name: 'Мапа', mediaUrl: 'not-url' }).success).toBe(false);
  });
});

// ─── XSS / Injection prevention ──────────────────────────────────────────────

describe('XSS sanitization', () => {
  it('strips HTML tags from quest title', () => {
    const result = QuestMetaSchema.safeParse({
      title: '<script>alert("xss")</script>Авантура',
      description: 'Опис',
      visibility: 'public',
      playMode: 'singleplayer',
      sequence: 'fixed',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Авантура');
      expect(result.data.title).not.toContain('<script>');
    }
  });

  it('strips HTML tags from description', () => {
    const result = QuestMetaSchema.safeParse({
      title: 'Авантура',
      description: '<img src=x onerror="alert(1)">Опис',
      visibility: 'public',
      playMode: 'singleplayer',
      sequence: 'fixed',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).not.toContain('<img');
      expect(result.data.description).toContain('Опис');
    }
  });

  it('strips script tags from player name', () => {
    const result = PlayerNameSchema.safeParse('<script>evil()</script>Игор');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Игор');
    }
  });
});

// ─── Player / Game ────────────────────────────────────────────────────────────

describe('PlayerNameSchema', () => {
  it('accepts normal name', () => {
    const r = PlayerNameSchema.safeParse('Игор Богданоски');
    expect(r.success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = PlayerNameSchema.safeParse('   ');
    expect(r.success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    const r = PlayerNameSchema.safeParse('а'.repeat(101));
    expect(r.success).toBe(false);
  });
});

describe('QuestResultSchema', () => {
  const valid = {
    questId:     'abc123',
    playerName:  'Игор',
    points:      250,
    completedAt: new Date().toISOString(),
  };

  it('accepts valid result', () => {
    expect(QuestResultSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects negative points', () => {
    expect(QuestResultSchema.safeParse({ ...valid, points: -1 }).success).toBe(false);
  });

  it('rejects points over 1 million', () => {
    expect(QuestResultSchema.safeParse({ ...valid, points: 1_000_001 }).success).toBe(false);
  });

  it('rejects invalid completedAt date', () => {
    expect(QuestResultSchema.safeParse({ ...valid, completedAt: 'not-a-date' }).success).toBe(false);
  });
});

// ─── GPS / Coordinates ────────────────────────────────────────────────────────

describe('FindSpotStageSchema coordinates', () => {
  const base = {
    type: 'FIND_SPOT' as const,
    title: 'Пронајди место',
    description: 'Опис',
    targetCoordinates: { latitude: 41.99, longitude: 21.43 },
    radiusMeters: 50,
  };

  it('accepts valid Skopje coordinates', () => {
    expect(FindSpotStageSchema.safeParse(base).success).toBe(true);
  });

  it('rejects latitude out of range', () => {
    const r = FindSpotStageSchema.safeParse({
      ...base,
      targetCoordinates: { latitude: 200, longitude: 21.43 },
    });
    expect(r.success).toBe(false);
  });

  it('rejects longitude out of range', () => {
    const r = FindSpotStageSchema.safeParse({
      ...base,
      targetCoordinates: { latitude: 41.99, longitude: 999 },
    });
    expect(r.success).toBe(false);
  });

  it('rejects radius over 10km', () => {
    expect(FindSpotStageSchema.safeParse({ ...base, radiusMeters: 10_001 }).success).toBe(false);
  });
});

// ─── Feedback ─────────────────────────────────────────────────────────────────

describe('FeedbackSchema', () => {
  it('accepts valid comment', () => {
    expect(FeedbackSchema.safeParse({ comment: 'Одлична авантура!' }).success).toBe(true);
  });

  it('rejects comment over 1000 chars', () => {
    expect(FeedbackSchema.safeParse({ comment: 'а'.repeat(1001) }).success).toBe(false);
  });

  it('strips HTML from comment', () => {
    const r = FeedbackSchema.safeParse({ comment: '<b>Браво</b>' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.comment).toBe('Браво');
  });
});

// ─── Email ────────────────────────────────────────────────────────────────────

describe('CollaboratorEmailSchema', () => {
  it('accepts valid email', () => {
    const r = CollaboratorEmailSchema.safeParse('test@example.com');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('test@example.com');
  });

  it('normalises to lowercase', () => {
    const r = CollaboratorEmailSchema.safeParse('Test@Example.COM');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('test@example.com');
  });

  it('rejects invalid email', () => {
    expect(CollaboratorEmailSchema.safeParse('not-an-email').success).toBe(false);
  });
});

// ─── QuizStageSchema ──────────────────────────────────────────────────────────

describe('QuizStageSchema', () => {
  const base = {
    type: 'QUIZ' as const,
    title: 'Прашање',
    description: 'Опис',
    questionType: 'multiple_choice' as const,
    correctAnswer: 'Скопје',
    options: ['Скопје', 'Битола', 'Охрид', 'Струмица'],
  };

  it('accepts valid multiple choice quiz', () => {
    expect(QuizStageSchema.safeParse(base).success).toBe(true);
  });

  it('accepts free_text without options', () => {
    const r = QuizStageSchema.safeParse({
      ...base,
      questionType: 'free_text',
      correctAnswer: 'Македонија',
      options: undefined,
    });
    expect(r.success).toBe(true);
  });

  it('accepts estimate_number with numeric correctAnswer', () => {
    const r = QuizStageSchema.safeParse({
      ...base,
      questionType: 'estimate_number',
      correctAnswer: 42,
    });
    expect(r.success).toBe(true);
  });

  it('rejects timeLimitSeconds over 3600', () => {
    const r = QuizStageSchema.safeParse({ ...base, timeLimitSeconds: 3601 });
    expect(r.success).toBe(false);
  });

  it('accepts timeLimitSeconds = 0 (no timer)', () => {
    const r = QuizStageSchema.safeParse({ ...base, timeLimitSeconds: 0 });
    expect(r.success).toBe(true);
  });

  it('rejects more than 8 options', () => {
    const r = QuizStageSchema.safeParse({
      ...base,
      options: Array.from({ length: 9 }, (_, i) => `Option ${i}`),
    });
    expect(r.success).toBe(false);
  });

  it('rejects negative points', () => {
    const r = QuizStageSchema.safeParse({ ...base, points: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects points over 10 000', () => {
    const r = QuizStageSchema.safeParse({ ...base, points: 10_001 });
    expect(r.success).toBe(false);
  });

  it('strips XSS from title and description', () => {
    const r = QuizStageSchema.safeParse({
      ...base,
      title: '<script>evil()</script>Прашање',
      description: '<img onerror="x">Опис',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.title).toBe('Прашање');
      expect(r.data.description).toBe('Опис');
    }
  });
});

// ─── SurveyStageSchema ────────────────────────────────────────────────────────

describe('SurveyStageSchema', () => {
  const base = {
    type: 'SURVEY' as const,
    title: 'Анкета',
    description: 'Одговори на прашањата',
    surveyQuestions: ['Прашање 1', 'Прашање 2'],
  };

  it('accepts valid survey', () => {
    expect(SurveyStageSchema.safeParse(base).success).toBe(true);
  });

  it('rejects empty questions array', () => {
    const r = SurveyStageSchema.safeParse({ ...base, surveyQuestions: [] });
    expect(r.success).toBe(false);
  });

  it('rejects more than 20 questions', () => {
    const r = SurveyStageSchema.safeParse({
      ...base,
      surveyQuestions: Array.from({ length: 21 }, (_, i) => `Прашање ${i + 1}`),
    });
    expect(r.success).toBe(false);
  });

  it('accepts exactly 20 questions', () => {
    const r = SurveyStageSchema.safeParse({
      ...base,
      surveyQuestions: Array.from({ length: 20 }, (_, i) => `Прашање ${i + 1}`),
    });
    expect(r.success).toBe(true);
  });

  it('rejects question over 500 chars', () => {
    const r = SurveyStageSchema.safeParse({
      ...base,
      surveyQuestions: ['а'.repeat(501)],
    });
    expect(r.success).toBe(false);
  });
});

// ─── ScanCodeStageSchema ──────────────────────────────────────────────────────

describe('ScanCodeStageSchema', () => {
  const base = {
    type: 'SCAN_CODE' as const,
    title: 'Скенирај код',
    description: 'Пронајди QR код',
    targetQrPayload: 'AVNTR-2026-OKTOBAR',
  };

  it('accepts valid scan code stage', () => {
    expect(ScanCodeStageSchema.safeParse(base).success).toBe(true);
  });

  it('rejects empty payload', () => {
    const r = ScanCodeStageSchema.safeParse({ ...base, targetQrPayload: '' });
    expect(r.success).toBe(false);
  });

  it('rejects payload over 500 chars', () => {
    const r = ScanCodeStageSchema.safeParse({ ...base, targetQrPayload: 'x'.repeat(501) });
    expect(r.success).toBe(false);
  });
});

// ─── FindSpotStageSchema — edge cases ────────────────────────────────────────

describe('FindSpotStageSchema edge cases', () => {
  const base = {
    type: 'FIND_SPOT' as const,
    title: 'Пронајди место',
    description: 'Опис',
    targetCoordinates: { latitude: 41.99, longitude: 21.43 },
    radiusMeters: 50,
  };

  it('rejects radiusMeters < 1', () => {
    expect(FindSpotStageSchema.safeParse({ ...base, radiusMeters: 0 }).success).toBe(false);
    expect(FindSpotStageSchema.safeParse({ ...base, radiusMeters: -5 }).success).toBe(false);
  });

  it('accepts boundary latitude values -90 and +90', () => {
    expect(FindSpotStageSchema.safeParse({
      ...base, targetCoordinates: { latitude: -90, longitude: 0 },
    }).success).toBe(true);
    expect(FindSpotStageSchema.safeParse({
      ...base, targetCoordinates: { latitude: 90, longitude: 0 },
    }).success).toBe(true);
  });

  it('accepts boundary longitude values -180 and +180', () => {
    expect(FindSpotStageSchema.safeParse({
      ...base, targetCoordinates: { latitude: 0, longitude: -180 },
    }).success).toBe(true);
    expect(FindSpotStageSchema.safeParse({
      ...base, targetCoordinates: { latitude: 0, longitude: 180 },
    }).success).toBe(true);
  });

  it('accepts optional audioUrl when valid', () => {
    const r = FindSpotStageSchema.safeParse({ ...base, audioUrl: 'https://example.com/audio.mp3' });
    expect(r.success).toBe(true);
  });

  it('accepts empty string audioUrl (cleared field)', () => {
    const r = FindSpotStageSchema.safeParse({ ...base, audioUrl: '' });
    expect(r.success).toBe(true);
  });
});

// ─── QuestResultSchema — edge cases ──────────────────────────────────────────

describe('QuestResultSchema edge cases', () => {
  const valid = {
    questId: 'abc123',
    playerName: 'Игор',
    points: 0,
    completedAt: new Date().toISOString(),
  };

  it('accepts 0 points (minimum)', () => {
    expect(QuestResultSchema.safeParse({ ...valid, points: 0 }).success).toBe(true);
  });

  it('accepts 1 000 000 points (maximum)', () => {
    expect(QuestResultSchema.safeParse({ ...valid, points: 1_000_000 }).success).toBe(true);
  });

  it('rejects questId over 128 chars', () => {
    expect(QuestResultSchema.safeParse({ ...valid, questId: 'x'.repeat(129) }).success).toBe(false);
  });

  it('rejects empty questId', () => {
    expect(QuestResultSchema.safeParse({ ...valid, questId: '' }).success).toBe(false);
  });

  it('accepts optional teamCode', () => {
    expect(QuestResultSchema.safeParse({ ...valid, teamCode: 'TEAM-A' }).success).toBe(true);
  });

  it('rejects teamCode over 50 chars', () => {
    expect(QuestResultSchema.safeParse({ ...valid, teamCode: 'x'.repeat(51) }).success).toBe(false);
  });
});
