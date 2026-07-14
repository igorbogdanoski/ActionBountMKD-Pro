/**
 * Canonical HTML stripper for user-authored text (quest titles/descriptions,
 * AI-generated quest content, feedback comments, player names). Removes
 * dangerous tag blocks (script/style/iframe) INCLUDING their content, then
 * strips any remaining HTML tags, to prevent stored XSS in Firestore text
 * fields. This is the single source of truth — do not re-implement locally,
 * a second copy is exactly how a future fix (e.g. blocking a new dangerous
 * tag) silently misses one of the call sites.
 */
export function stripHtml(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}
