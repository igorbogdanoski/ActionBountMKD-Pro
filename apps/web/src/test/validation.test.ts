import { describe, it, expect } from 'vitest';
import {
  QuestMetaSchema,
  PlayerNameSchema,
  QuestResultSchema,
  FeedbackSchema,
  CollaboratorEmailSchema,
  FindSpotStageSchema,
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
