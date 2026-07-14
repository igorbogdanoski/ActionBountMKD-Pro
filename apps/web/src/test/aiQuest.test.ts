import { describe, it, expect } from 'vitest';
import {
  buildQuestPrompt,
  parseAiQuest,
  clampStageCount,
  AiQuestError,
  MIN_STAGES,
  MAX_STAGES,
  DEFAULT_STAGE_POINTS,
  type AiQuestRequest,
  type QuizStage,
} from 'shared';

// deterministic id factory for stable assertions
function seqIds() {
  let n = 0;
  return () => `id-${n++}`;
}

const baseReq: AiQuestRequest = {
  topic: 'Сончев систем',
  subject: 'Природни науки',
  grade: '4-6 одд.',
  stageCount: 5,
};

// ─── clampStageCount ────────────────────────────────────────────────────────────

describe('clampStageCount', () => {
  it('clamps below the minimum', () => {
    expect(clampStageCount(0)).toBe(MIN_STAGES);
    expect(clampStageCount(-10)).toBe(MIN_STAGES);
  });

  it('clamps above the maximum', () => {
    expect(clampStageCount(999)).toBe(MAX_STAGES);
  });

  it('rounds and keeps in-range values', () => {
    expect(clampStageCount(5)).toBe(5);
    expect(clampStageCount(6.4)).toBe(6);
  });

  it('falls back to minimum for NaN', () => {
    expect(clampStageCount(NaN)).toBe(MIN_STAGES);
  });
});

// ─── buildQuestPrompt ───────────────────────────────────────────────────────────

describe('buildQuestPrompt', () => {
  it('includes the topic, subject, grade and clamped stage count', () => {
    const prompt = buildQuestPrompt({ ...baseReq, stageCount: 5 });
    expect(prompt).toContain('Сончев систем');
    expect(prompt).toContain('Природни науки');
    expect(prompt).toContain('4-6 одд.');
    expect(prompt).toContain('ТОЧНО 5 етапи');
  });

  it('clamps an out-of-range stage count in the prompt', () => {
    const prompt = buildQuestPrompt({ ...baseReq, stageCount: 500 });
    expect(prompt).toContain(`ТОЧНО ${MAX_STAGES} етапи`);
  });

  it('asks for strict JSON output', () => {
    const prompt = buildQuestPrompt(baseReq);
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('"stages"');
  });

  it('adds KaTeX instruction for math topics', () => {
    const prompt = buildQuestPrompt({ ...baseReq, subject: 'Математика', topic: 'Дропки' });
    expect(prompt).toContain('KaTeX');
  });
});

// ─── parseAiQuest: happy path ─────────────────────────────────────────────────────

describe('parseAiQuest', () => {
  const validJson = JSON.stringify({
    title: 'Авантура низ вселената',
    description: 'Истражи го сончевиот систем.',
    stages: [
      { type: 'INFO', title: 'Вовед', description: 'Сончевиот систem има 8 планети.' },
      {
        type: 'QUIZ',
        title: 'Прашање 1',
        description: 'Која е најголемата планета?',
        questionType: 'multiple_choice',
        options: ['Земја', 'Јупитер', 'Марс'],
        correctAnswer: 'Јупитер',
      },
    ],
  });

  it('parses a clean JSON object string', () => {
    const quest = parseAiQuest(validJson, { makeId: seqIds() });
    expect(quest.title).toBe('Авантура низ вселената');
    expect(quest.stages).toHaveLength(2);
  });

  it('parses an already-parsed object', () => {
    const quest = parseAiQuest(JSON.parse(validJson), { makeId: seqIds() });
    expect(quest.stages[0].type).toBe('INFO');
  });

  it('extracts JSON from a ```json fenced block', () => {
    const fenced = '```json\n' + validJson + '\n```';
    const quest = parseAiQuest(fenced, { makeId: seqIds() });
    expect(quest.title).toBe('Авантура низ вселената');
  });

  it('assigns sequential order and ids', () => {
    const quest = parseAiQuest(validJson, { makeId: seqIds() });
    expect(quest.stages.map(s => s.id)).toEqual(['id-0', 'id-1']);
    expect(quest.stages.map(s => s.order)).toEqual([0, 1]);
  });

  it('assigns default points', () => {
    const quest = parseAiQuest(validJson, { makeId: seqIds() });
    expect(quest.stages[0].points).toBe(DEFAULT_STAGE_POINTS);
  });

  it('maps a valid multiple_choice quiz with options', () => {
    const quest = parseAiQuest(validJson, { makeId: seqIds() });
    const quiz = quest.stages[1] as QuizStage;
    expect(quiz.type).toBe('QUIZ');
    expect(quiz.questionType).toBe('multiple_choice');
    expect(quiz.options).toEqual(['Земја', 'Јупитер', 'Марс']);
    expect(quiz.correctAnswer).toBe('Јупитер');
    expect(quiz.requiredToAdvance).toBe(false);
  });

  it('resolves a numeric correctAnswer index to the option text', () => {
    const json = JSON.stringify({
      title: 'T', description: 'D',
      stages: [{ type: 'QUIZ', title: 'Q', description: 'Q?', questionType: 'multiple_choice', options: ['A', 'B', 'C'], correctAnswer: 2 }],
    });
    const quiz = parseAiQuest(json, { makeId: seqIds() }).stages[0] as QuizStage;
    expect(quiz.correctAnswer).toBe('C');
  });

  it('falls back correctAnswer to first option when answer not in options', () => {
    const json = JSON.stringify({
      title: 'T', description: 'D',
      stages: [{ type: 'QUIZ', title: 'Q', description: 'Q?', questionType: 'multiple_choice', options: ['A', 'B'], correctAnswer: 'Z' }],
    });
    const quiz = parseAiQuest(json, { makeId: seqIds() }).stages[0] as QuizStage;
    expect(quiz.correctAnswer).toBe('A');
  });

  it('downgrades multiple_choice with too few options to free_text', () => {
    const json = JSON.stringify({
      title: 'T', description: 'D',
      stages: [{ type: 'QUIZ', title: 'Q', description: 'Q?', questionType: 'multiple_choice', options: ['only'], correctAnswer: 'only' }],
    });
    const quiz = parseAiQuest(json, { makeId: seqIds() }).stages[0] as QuizStage;
    expect(quiz.questionType).toBe('free_text');
    expect(quiz.options).toBeUndefined();
  });

  it('coerces an estimate_number answer to a number', () => {
    const json = JSON.stringify({
      title: 'T', description: 'D',
      stages: [{ type: 'QUIZ', title: 'Q', description: 'Колку?', questionType: 'estimate_number', correctAnswer: '42' }],
    });
    const quiz = parseAiQuest(json, { makeId: seqIds() }).stages[0] as QuizStage;
    expect(quiz.correctAnswer).toBe(42);
  });

  it('defaults unknown stage types to INFO', () => {
    const json = JSON.stringify({
      title: 'T', description: 'D',
      stages: [{ type: 'MAGIC', title: 'X', description: 'Y' }],
    });
    const quest = parseAiQuest(json, { makeId: seqIds() });
    expect(quest.stages[0].type).toBe('INFO');
  });

  it('clamps the number of stages to MAX_STAGES', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ type: 'INFO', title: `S${i}`, description: 'd' }));
    const json = JSON.stringify({ title: 'T', description: 'D', stages: many });
    const quest = parseAiQuest(json, { makeId: seqIds() });
    expect(quest.stages).toHaveLength(MAX_STAGES);
  });

  it('sanitizes HTML in titles and descriptions', () => {
    const json = JSON.stringify({
      title: '<script>alert(1)</script>Безбедно',
      description: '<b>Здраво</b>',
      stages: [{ type: 'INFO', title: '<img src=x onerror=1>Етапа', description: 'ок' }],
    });
    const quest = parseAiQuest(json, { makeId: seqIds() });
    expect(quest.title).toBe('Безбедно');
    expect(quest.description).toBe('Здраво');
    expect(quest.stages[0].title).toBe('Етапа');
  });

  it('supplies fallback titles/description when missing', () => {
    const json = JSON.stringify({ stages: [{ type: 'INFO', description: '' }] });
    const quest = parseAiQuest(json, { makeId: seqIds() });
    expect(quest.title).toBe('Нова авантура');
    expect(quest.stages[0].title).toBe('Етапа 1');
  });

  it('throws AiQuestError(parse) on non-JSON garbage', () => {
    expect(() => parseAiQuest('this is not json', { makeId: seqIds() }))
      .toThrowError(AiQuestError);
    try {
      parseAiQuest('not json at all', { makeId: seqIds() });
    } catch (e) {
      expect((e as AiQuestError).code).toBe('parse');
    }
  });

  it('throws AiQuestError(invalid) when stages are missing or empty', () => {
    try {
      parseAiQuest(JSON.stringify({ title: 'T', description: 'D', stages: [] }), { makeId: seqIds() });
    } catch (e) {
      expect((e as AiQuestError).code).toBe('invalid');
    }
    expect(() => parseAiQuest(JSON.stringify({ title: 'T' }), { makeId: seqIds() }))
      .toThrowError(AiQuestError);
  });
});

