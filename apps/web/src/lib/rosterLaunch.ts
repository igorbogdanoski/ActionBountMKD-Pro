import type { GroupStudent } from 'shared';

export interface RosterLaunchIdentity {
  studentId: string;
  studentName: string;
}

export function parseRosterLaunch(search: string): RosterLaunchIdentity | null {
  const params = new URLSearchParams(search);
  const studentId = params.get('student')?.trim() ?? '';
  const studentName = params.get('name')?.trim() ?? '';

  if (!studentId || studentId.length > 128 || !studentName || studentName.length > 100) {
    return null;
  }
  return { studentId, studentName };
}

export function buildRosterLaunchUrl(
  origin: string,
  questId: string,
  student: Pick<GroupStudent, 'id' | 'name'>,
): string {
  const params = new URLSearchParams({ student: student.id, name: student.name });
  return `${origin.replace(/\/$/, '')}/play/${encodeURIComponent(questId)}?${params.toString()}`;
}
