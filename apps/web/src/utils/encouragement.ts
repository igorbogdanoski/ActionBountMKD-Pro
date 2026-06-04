/** Player progress as a 0–100 integer percentage. Pure. */
export function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(Math.max(completed, 0), total) / total) * 100);
}

const DONE = 'Браво! Ја заврши целата авантура! 🎉';
const THREE_Q = 'Само уште малку — речиси си таму! 💪';
const HALF = 'Половина пат помина — одлично одиш! ⭐';
const QUARTER = 'Добар почеток — продолжи така! 🚀';

/**
 * Encouraging milestone message for the player, or null when the freshly
 * completed stage count does not cross a 25 / 50 / 75 / 100% milestone. Pure.
 */
export function milestoneEncouragement(completed: number, total: number): string | null {
  if (total <= 0 || completed <= 0) return null;
  if (completed >= total) return DONE;
  const q3 = Math.ceil(total * 0.75);
  const q2 = Math.ceil(total * 0.5);
  const q1 = Math.ceil(total * 0.25);
  if (completed === q3) return THREE_Q;
  if (completed === q2) return HALF;
  if (completed === q1) return QUARTER;
  return null;
}
