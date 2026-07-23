import { describe, expect, it } from 'vitest';
import { buildRosterLaunchUrl, parseRosterLaunch } from '../lib/rosterLaunch';

describe('roster launch contract', () => {
  it('round-trips an opaque student id and Unicode display name', () => {
    const url = buildRosterLaunchUrl(
      'https://avantura.mk/',
      'quest/with spaces',
      { id: 'student-123', name: 'Ана Петрова' },
    );
    const parsedUrl = new URL(url);

    expect(parsedUrl.pathname).toBe('/play/quest%2Fwith%20spaces');
    expect(parseRosterLaunch(parsedUrl.search)).toEqual({
      studentId: 'student-123',
      studentName: 'Ана Петрова',
    });
  });

  it.each([
    '',
    '?student=student-1',
    '?name=Ana',
    `?student=${'x'.repeat(129)}&name=Ana`,
    `?student=student-1&name=${'x'.repeat(101)}`,
  ])('rejects incomplete or unbounded identity: %s', search => {
    expect(parseRosterLaunch(search)).toBeNull();
  });
});
