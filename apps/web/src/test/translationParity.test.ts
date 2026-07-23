import { describe, expect, it } from 'vitest';
import mk from '../i18n/mk.json';
import en from '../i18n/en.json';

type TranslationValue =
  | string
  | number
  | boolean
  | null
  | TranslationValue[]
  | { [key: string]: TranslationValue };

const valueKind = (value: TranslationValue) => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
};

const placeholders = (value: string) =>
  [...value.matchAll(/\{\{\s*([^},\s]+)[^}]*\}\}/g)]
    .map(match => match[1])
    .sort();

function collectParityErrors(
  reference: TranslationValue,
  candidate: TranslationValue,
  path = '<root>',
): string[] {
  const errors: string[] = [];
  const referenceKind = valueKind(reference);
  const candidateKind = valueKind(candidate);

  if (referenceKind !== candidateKind) {
    return [`${path}: expected ${referenceKind}, received ${candidateKind}`];
  }

  if (typeof reference === 'string' && typeof candidate === 'string') {
    const expectedPlaceholders = placeholders(reference);
    const receivedPlaceholders = placeholders(candidate);
    if (JSON.stringify(expectedPlaceholders) !== JSON.stringify(receivedPlaceholders)) {
      errors.push(
        `${path}: interpolation placeholders differ ` +
        `(expected ${JSON.stringify(expectedPlaceholders)}, received ${JSON.stringify(receivedPlaceholders)})`,
      );
    }
    return errors;
  }

  if (Array.isArray(reference) && Array.isArray(candidate)) {
    if (reference.length !== candidate.length) {
      errors.push(`${path}: array length differs (expected ${reference.length}, received ${candidate.length})`);
    }
    const sharedLength = Math.min(reference.length, candidate.length);
    for (let index = 0; index < sharedLength; index += 1) {
      errors.push(...collectParityErrors(reference[index], candidate[index], `${path}[${index}]`));
    }
    return errors;
  }

  if (
    reference !== null &&
    candidate !== null &&
    typeof reference === 'object' &&
    typeof candidate === 'object'
  ) {
    const referenceRecord = reference as Record<string, TranslationValue>;
    const candidateRecord = candidate as Record<string, TranslationValue>;
    const referenceKeys = Object.keys(referenceRecord).sort();
    const candidateKeys = Object.keys(candidateRecord).sort();

    for (const key of referenceKeys.filter(key => !(key in candidateRecord))) {
      errors.push(`${path}.${key}: missing key`);
    }
    for (const key of candidateKeys.filter(key => !(key in referenceRecord))) {
      errors.push(`${path}.${key}: extra key`);
    }
    for (const key of referenceKeys.filter(key => key in candidateRecord)) {
      errors.push(
        ...collectParityErrors(referenceRecord[key], candidateRecord[key], `${path}.${key}`),
      );
    }
  }

  return errors;
}

describe('Translation parity', () => {
  it('keeps the English locale structurally aligned with Macedonian', () => {
    const errors = collectParityErrors(
      mk as TranslationValue,
      en as TranslationValue,
    );

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
