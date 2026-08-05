import { describe, expect, it } from 'vitest';
import type { RosterLaunch } from 'shared';
import { ROSTER_LAUNCH_LIFETIME_MS } from 'shared';
import {
  buildRosterLaunchSetId,
  buildRosterLaunchUrl,
  createRosterLaunch,
  hasLegacyRosterLaunch,
  hasRosterLaunchReference,
  parseRosterLaunch,
  rosterLaunchProblem,
} from '../lib/rosterLaunch';

const LAUNCH_ID = '12345678-1234-4234-8234-123456789abc';
const NOW = 1_800_000_000_000;

function launch(overrides: Partial<RosterLaunch> = {}): RosterLaunch {
  return { ...createRosterLaunch({
    ownerId: 'teacher-1',
    groupId: 'group-1',
    questId: 'quest-1',
    generationId: 'generation-1',
    student: { id: 'student-1', name: 'Ана Петрова' },
  }, NOW, LAUNCH_ID), ...overrides };
}

describe('opaque roster launch contract', () => {
  it('places only the opaque launch id in the URL fragment', () => {
    const url = buildRosterLaunchUrl('https://avantura.mk/', 'quest/with spaces', LAUNCH_ID);
    const parsedUrl = new URL(url);

    expect(parsedUrl.pathname).toBe('/play/quest%2Fwith%20spaces');
    expect(parsedUrl.search).toBe('');
    expect(parsedUrl.hash).toBe(`#launch=${LAUNCH_ID}`);
    expect(url).not.toContain('student-1');
    expect(url).not.toContain(encodeURIComponent('Ана Петрова'));
    expect(parseRosterLaunch(parsedUrl.hash)).toEqual({ launchId: LAUNCH_ID });
  });

  it.each(['', '#launch=short', `#launch=${'x'.repeat(129)}`, '#student=student-1']) (
    'rejects missing or unbounded launch references: %s',
    hash => expect(parseRosterLaunch(hash)).toBeNull(),
  );

  it('detects legacy PII-bearing roster query links', () => {
    expect(hasLegacyRosterLaunch('?student=student-1&name=Ana')).toBe(true);
    expect(hasLegacyRosterLaunch('?source=teacher')).toBe(false);
  });

  it('distinguishes malformed launch fragments from normal guest fragments', () => {
    expect(hasRosterLaunchReference('#launch=short')).toBe(true);
    expect(hasRosterLaunchReference('#section=intro')).toBe(false);
  });

  it('creates a bounded 30-day launch tied to one set generation', () => {
    const created = launch();
    expect(created).toMatchObject({
      id: LAUNCH_ID,
      setId: buildRosterLaunchSetId('group-1', 'quest-1'),
      generationId: 'generation-1',
      questId: 'quest-1',
      studentId: 'student-1',
      studentName: 'Ана Петрова',
      issuedAtMs: NOW,
      expiresAtMs: NOW + ROSTER_LAUNCH_LIFETIME_MS,
    });
  });

  it('rejects missing, expired, malformed and wrong-quest launches', () => {
    expect(rosterLaunchProblem(null, 'quest-1', NOW)).toBe('missing');
    expect(rosterLaunchProblem(launch(), 'quest-2', NOW)).toBe('quest-mismatch');
    expect(rosterLaunchProblem({ ...launch(), expiresAtMs: NOW }, 'quest-1', NOW)).toBe('expired');
    expect(rosterLaunchProblem({ ...launch(), expiresAtMs: 1.5 }, 'quest-1', NOW)).toBe('malformed');
    expect(rosterLaunchProblem(launch(), 'quest-1', NOW)).toBeNull();
  });
});
