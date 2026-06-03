import { describe, expect, it } from 'vitest';
import { groupAssignedCount, isStudentNameTaken } from 'shared';
import type { ClassGroup } from 'shared';

const makeGroup = (over: Partial<ClassGroup> = {}): ClassGroup => ({
  id: 'g1',
  ownerId: 'u1',
  name: '6-в',
  students: [],
  assignedQuestIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('groupAssignedCount', () => {
  it('returns 0 for undefined / null', () => {
    expect(groupAssignedCount(undefined)).toBe(0);
    expect(groupAssignedCount(null)).toBe(0);
  });

  it('returns 0 when no adventures assigned', () => {
    expect(groupAssignedCount(makeGroup())).toBe(0);
    expect(groupAssignedCount(makeGroup({ assignedQuestIds: undefined }))).toBe(0);
  });

  it('counts assigned adventures', () => {
    expect(groupAssignedCount(makeGroup({ assignedQuestIds: ['a', 'b', 'c'] }))).toBe(3);
  });
});

describe('isStudentNameTaken', () => {
  const group = makeGroup({
    students: [
      { id: 's1', name: 'Ана' },
      { id: 's2', name: '  Бојан  ' },
    ],
  });

  it('returns false for empty / whitespace names', () => {
    expect(isStudentNameTaken(group, '')).toBe(false);
    expect(isStudentNameTaken(group, '   ')).toBe(false);
  });

  it('returns false for null / undefined group', () => {
    expect(isStudentNameTaken(null, 'Ана')).toBe(false);
    expect(isStudentNameTaken(undefined, 'Ана')).toBe(false);
  });

  it('detects an exact match', () => {
    expect(isStudentNameTaken(group, 'Ана')).toBe(true);
  });

  it('is case-insensitive and whitespace-tolerant', () => {
    expect(isStudentNameTaken(group, '  ана ')).toBe(true);
    expect(isStudentNameTaken(group, 'бојан')).toBe(true);
  });

  it('returns false for a new unique name', () => {
    expect(isStudentNameTaken(group, 'Викторија')).toBe(false);
  });
});
