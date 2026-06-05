/**
 * First-run player onboarding (Phase 7E-4).
 *
 * Shows a short, friendly set of tips the first time someone plays on a device,
 * then never again (per-device localStorage flag). Pure helpers stay storage-
 * agnostic so they remain unit-testable.
 */
export const ONBOARDING_STORAGE_KEY = 'av_player_onboarded';

interface ReadableStorage {
  getItem(key: string): string | null;
}

/**
 * Whether the first-run onboarding tips should be shown. Returns false once the
 * player has dismissed them, and false on any storage failure (fail closed so a
 * blocked storage never traps the player behind a panel).
 */
export function shouldShowOnboarding(storage?: ReadableStorage | null): boolean {
  try {
    return storage?.getItem(ONBOARDING_STORAGE_KEY) !== '1';
  } catch {
    return false;
  }
}

export interface OnboardingTip {
  title: string;
  text: string;
}

/** Concise MK tips shown on the player start screen. Pure data. */
export const PLAYER_ONBOARDING_TIPS: OnboardingTip[] = [
  { title: 'Тргни на авантура', text: 'Поминувај низ етапите една по една и собирај поени за секоја решена задача.' },
  { title: 'Барај на терен', text: 'Некои етапи бараат да стигнеш до точка на мапата или да скенираш QR-код.' },
  { title: 'Заглави? Има совет', text: 'По погрешен обид се појавува совет, а можеш да пробаш повторно.' },
  { title: 'Безбедност', text: 'Во група, копчето 🆘 SOS ја праќа твојата локација до наставникот.' },
];
