export const BACKUP_DRILL_PROJECT_ID = 'demo-actionbountmkd-backup-drill';

export const BACKUP_DRILL_DOCUMENTS = [
  {
    path: 'users/teacher-backup',
    data: {
      uid: 'teacher-backup',
      displayName: 'Наставник за restore проверка',
      email: 'backup@example.test',
      plan: 'pro',
    },
  },
  {
    path: 'quests/quest-backup',
    data: {
      id: 'quest-backup',
      creatorId: 'teacher-backup',
      title: 'Резервна авантура — Ѓорѓи',
      visibility: 'secret',
      playMode: 'singleplayer',
      sequence: 'fixed',
      stageSchemaVersion: 2,
      stageRevision: 'backup-revision-00000001',
      stageCount: 1,
      createdAt: '2026-08-05T12:00:00.000Z',
      updatedAt: '2026-08-05T12:00:00.000Z',
    },
  },
  {
    path: 'quest_stages/quest-backup__stage-1',
    data: {
      id: 'stage-1',
      questId: 'quest-backup',
      creatorId: 'teacher-backup',
      stageRevision: 'backup-revision-00000001',
      type: 'INFO',
      title: 'Вовед',
      description: '',
      order: 0,
      mediaType: 'none',
    },
  },
  {
    path: 'groups/group-backup',
    data: {
      id: 'group-backup',
      ownerId: 'teacher-backup',
      name: '8-А',
      students: [{ id: 'student-1', name: 'Ана' }],
      assignedQuestIds: ['quest-backup'],
      createdAt: '2026-08-05T12:00:00.000Z',
      updatedAt: '2026-08-05T12:00:00.000Z',
    },
  },
  {
    path: 'quest_results/attempt-backup',
    data: {
      id: 'attempt-backup',
      attemptId: 'attempt-backup',
      questId: 'quest-backup',
      playerName: 'Ана',
      points: 10,
      completedAt: '2026-08-05T12:05:00.000Z',
      schemaVersion: 2,
      stageDurationCount: 1,
      submissionCount: 0,
      quizAnswerCount: 0,
    },
  },
  {
    path: 'quest_result_telemetry/attempt-backup_progress_0',
    data: {
      resultId: 'attempt-backup',
      attemptId: 'attempt-backup',
      questId: 'quest-backup',
      kind: 'progress',
      chunkIndex: 0,
      stageDurations: [{ stageId: 'stage-1', durationSec: 12 }],
      quizAnswers: [],
    },
  },
];
