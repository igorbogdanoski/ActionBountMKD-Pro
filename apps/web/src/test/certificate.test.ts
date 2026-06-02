/**
 * Certificate generation tests.
 *
 * `downloadCertificate` relies on Canvas API + jsPDF (both need a real browser
 * for the full path). Here we test:
 *   1. The public interface contract — CertificateData shape.
 *   2. Score label rendering logic (pure, extracted via a test-helper).
 *   3. Filename sanitization (pure string transform).
 *   4. That `downloadCertificate` calls canvas + jsPDF under a jsdom
 *      environment with stubbed Canvas and a jsPDF mock.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CertificateData } from '../utils/certificate';

// ─── Pure helpers (mirror internal logic without importing the module) ────────

/** Mirrors the score-label logic inside renderCanvas */
function scoreLabel(score: number, maxScore?: number): string {
  return maxScore && maxScore > 0
    ? `Освоени поени: ${score} / ${maxScore}`
    : `Освоени поени: ${score}`;
}

/** Mirrors the filename sanitization in downloadCertificate */
function safeName(playerName: string): string {
  return (playerName || 'играч').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
}

// ─── Score label ─────────────────────────────────────────────────────────────

describe('score label', () => {
  it('shows score / maxScore when maxScore > 0', () => {
    expect(scoreLabel(85, 100)).toBe('Освоени поени: 85 / 100');
  });

  it('shows score only when maxScore is 0', () => {
    expect(scoreLabel(85, 0)).toBe('Освоени поени: 85');
  });

  it('shows score only when maxScore is undefined', () => {
    expect(scoreLabel(42)).toBe('Освоени поени: 42');
  });

  it('handles zero score', () => {
    expect(scoreLabel(0, 50)).toBe('Освоени поени: 0 / 50');
  });

  it('handles perfect score', () => {
    expect(scoreLabel(100, 100)).toBe('Освоени поени: 100 / 100');
  });
});

// ─── Filename sanitization ────────────────────────────────────────────────────

describe('filename sanitization', () => {
  it('keeps Cyrillic letters', () => {
    expect(safeName('Игор')).toBe('Игор');
  });

  it('replaces spaces with underscores', () => {
    expect(safeName('Игор Богданоски')).toBe('Игор_Богданоски');
  });

  it('truncates names over 40 chars', () => {
    const long = 'А'.repeat(50);
    expect(safeName(long)).toHaveLength(40);
  });

  it('falls back to "играч" for empty name', () => {
    expect(safeName('')).toBe('играч');
  });

  it('strips special characters', () => {
    const result = safeName('Игор<script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('handles numbers in names', () => {
    expect(safeName('Player1')).toBe('Player1');
  });
});

// ─── CertificateData shape ───────────────────────────────────────────────────

describe('CertificateData type contract', () => {
  it('requires playerName, questTitle, and score', () => {
    const minimal: CertificateData = {
      playerName: 'Игор',
      questTitle: 'Скопска авантура',
      score: 250,
    };
    expect(minimal.playerName).toBe('Игор');
    expect(minimal.questTitle).toBe('Скопска авантура');
    expect(minimal.score).toBe(250);
  });

  it('allows optional fields', () => {
    const full: CertificateData = {
      playerName:   'Мартина',
      questTitle:   'Охридска тура',
      score:        180,
      maxScore:     200,
      date:         new Date('2026-06-01'),
      watermark:    false,
      organization: 'ОУ Гоце Делчев',
    };
    expect(full.maxScore).toBe(200);
    expect(full.watermark).toBe(false);
    expect(full.organization).toBe('ОУ Гоце Делчев');
  });
});

// ─── downloadCertificate with mocked DOM + jsPDF ────────────────────────────

// Top-level mock — vitest hoists this before any imports / describe blocks.
// We expose shared spy functions so tests can assert on them across instances.
const _addImageSpy = vi.fn();
const _saveSpy     = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: class MockJsPDF {
      internal = { pageSize: { getWidth: () => 841, getHeight: () => 595 } };
      addImage = _addImageSpy;
      save     = _saveSpy;
    },
  };
});

describe('downloadCertificate (integration with mocks)', () => {
  beforeEach(() => {
    _addImageSpy.mockReset();
    _saveSpy.mockReset();

    // ── Mock canvas context ────────────────────────────────────────────────
    const ctx: Record<string, unknown> = {
      fillRect:    vi.fn(),
      strokeRect:  vi.fn(),
      beginPath:   vi.fn(),
      moveTo:      vi.fn(),
      lineTo:      vi.fn(),
      arcTo:       vi.fn(),
      stroke:      vi.fn(),
      fill:        vi.fn(),
      fillText:    vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 200 }),
      save:        vi.fn(),
      restore:     vi.fn(),
      translate:   vi.fn(),
      rotate:      vi.fn(),
      roundRect:   vi.fn(),
      get textAlign()     { return 'center'; },
      set textAlign(_v)   { /* noop */ },
      get textBaseline()  { return 'alphabetic'; },
      set textBaseline(_v){ /* noop */ },
      get font()          { return ''; },
      set font(_v)        { /* noop */ },
      get fillStyle()     { return '#000'; },
      set fillStyle(_v)   { /* noop */ },
      get strokeStyle()   { return '#000'; },
      set strokeStyle(_v) { /* noop */ },
      get lineWidth()     { return 1; },
      set lineWidth(_v)   { /* noop */ },
      get globalAlpha()   { return 1; },
      set globalAlpha(_v) { /* noop */ },
    };

    // ── Stub HTMLCanvasElement ─────────────────────────────────────────────
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ctx,
          toDataURL: () => 'data:image/jpeg;base64,FAKE',
        } as unknown as HTMLCanvasElement;
      }
      // Google Fonts <link> element
      if (tag === 'link') {
        return {
          rel: '',
          href: '',
          setAttribute: vi.fn(),
          get dataset() { return {}; },
        } as unknown as HTMLLinkElement;
      }
      return document.createElement.call(document, tag);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls addImage and save with a sanitized filename', async () => {
    const { downloadCertificate } = await import('../utils/certificate');
    await downloadCertificate({
      playerName: 'Игор Тест',
      questTitle: 'Авантура',
      score: 80,
      maxScore: 100,
    });

    expect(_addImageSpy).toHaveBeenCalled();
    expect(_saveSpy).toHaveBeenCalled();
    const filename: string = _saveSpy.mock.calls[0]?.[0] ?? '';
    expect(filename).toMatch(/^Сертификат_/);
    expect(filename).toMatch(/\.pdf$/);
  });

  it('still generates when playerName is empty (uses fallback)', async () => {
    const { downloadCertificate } = await import('../utils/certificate');
    await downloadCertificate({ playerName: '', questTitle: 'Тест', score: 0 });
    const filename: string = _saveSpy.mock.calls[0]?.[0] ?? '';
    expect(filename).toContain('играч');
  });
});
