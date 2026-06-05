/**
 * Whether a progressive hint should be revealed to the student. A hint appears
 * only after at least one wrong attempt and when a non-empty hint text exists.
 * Pure & side-effect free.
 */
export function shouldRevealHint(wrongAttempts: number, hintText?: string | null): boolean {
  if (!hintText || hintText.trim().length === 0) return false;
  return wrongAttempts >= 1;
}
