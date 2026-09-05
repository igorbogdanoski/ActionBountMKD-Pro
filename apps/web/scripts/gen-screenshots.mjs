/**
 * Regenerates the PWA screenshots in public/ from the running application.
 *
 * The images these replace were AI-drawn mockups whose Cyrillic was invented —
 * the desktop one read "Едикатовннанио GPS авантура креатор". They are declared
 * in manifest.json, so they surface in the browser install prompt and in a store
 * listing. Rendering them from the real UI keeps them honest, and lets them be
 * regenerated whenever the interface changes.
 *
 * Runs against the authenticated QA harness (e2e/vite.auth.config.ts), which
 * serves the real components with the Firebase modules mocked, so no credentials
 * and no network are involved. The demo adventure below is seeded through the
 * same localStorage key the QA storage mock reads.
 *
 * Usage: npm run gen:screenshots --prefix apps/web
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../public');
const repoRoot = path.resolve(here, '../../..');
const ORIGIN = 'http://127.0.0.1:3100';

/**
 * Each target renders at its own CSS viewport and is scaled up to the output
 * pixel size that manifest.json declares. The phone deliberately uses a real
 * handset viewport rather than the output size divided by two: at 768 CSS px
 * the player renders its tablet layout and the capture comes out letterboxed.
 * Changing any `scale` here means changing the matching `sizes` in manifest.json.
 */
const DESKTOP = { viewport: { width: 1376, height: 768 }, scale: 2 };
const MOBILE = { viewport: { width: 412, height: 732 }, scale: 3 };

/** Roughly 200 m north of the Камен мост target, so the GPS stage renders a live
 *  distance rather than the permission-denied state. */
const PLAYER_POSITION = { latitude: 41.9983, longitude: 21.4314 };

const outputSize = ({ viewport, scale }) => `${viewport.width * scale}x${viewport.height * scale}`;

const OBJECTIVE_MEASURE = 'obj-mera';
const OBJECTIVE_GEOMETRY = 'obj-geometrija';

const DEMO_QUEST = {
  id: 'demo-carsija',
  creatorId: 'qa-teacher',
  title: 'Математичка прошетка низ стара чаршија',
  description: 'Теренска настава по математика за VI одделение — мерење, размер и геометрија на отворено.',
  visibility: 'secret',
  playMode: 'multiplayer',
  sequence: 'fixed',
  certificateEnabled: true,
  playingTimeMinutes: 90,
  createdAt: new Date('2026-09-01T09:00:00Z').toISOString(),
  updatedAt: new Date('2026-09-01T09:00:00Z').toISOString(),
  pedagogy: {
    subject: 'Математика',
    grade: '6 одд.',
    curriculumRef: 'МАТ-6.3',
    learningObjectives: [
      { id: OBJECTIVE_MEASURE, label: 'Мери должини и проценува во метри' },
      { id: OBJECTIVE_GEOMETRY, label: 'Препознава симетрија во околината' },
    ],
  },
  stages: [
    {
      id: 'st-vovede', type: 'INFO', order: 0, points: 0, mediaType: 'none',
      title: 'Добредојдовте во чаршијата',
      description: 'Кратко воведе и правила на движење за групата. Останете заедно и внимавајте на сообраќајот.',
    },
    {
      id: 'st-most', type: 'FIND_SPOT', order: 1, points: 20,
      title: 'Пронајди го Камен мост',
      description: 'Придвижете се до мостот и застанете на средината.',
      targetCoordinates: { latitude: 41.9965, longitude: 21.4314 },
      radiusMeters: 25, showMode: 'map', requiredToAdvance: true,
      objectiveRef: OBJECTIVE_MEASURE,
    },
    {
      id: 'st-lakovi', type: 'QUIZ', order: 2, points: 30,
      title: 'Колку лакови има мостот?',
      description: 'Изброј ги лаковите и внеси го бројот.',
      questionType: 'estimate_number', correctAnswer: 12, requiredToAdvance: true,
      objectiveRef: OBJECTIVE_MEASURE,
    },
    {
      id: 'st-bezisten', type: 'QR_TASK', order: 3, points: 25,
      title: 'QR кај Безистен',
      description: 'Скенирај го кодот на влезот за да ја добиеш задачата.',
      targetQrPayload: 'bezisten-01',
      taskTitle: 'Измери го чекорот',
      taskDescription: 'Измерете ја должината на просторијата со чекори, па пресметајте во метри.',
      answerType: 'text', requiredToAdvance: false,
      objectiveRef: OBJECTIVE_MEASURE,
    },
    {
      id: 'st-simetrija', type: 'MISSION', order: 4, points: 25,
      title: 'Фотографија на симетрија',
      description: 'Најдете и фотографирајте фасада со симетрична шара.',
      submissionType: 'photo',
      objectiveRef: OBJECTIVE_GEOMETRY,
    },
  ],
};

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`QA сервер не одговори на ${url} во зададеното време`);
}

async function seedQuest(page) {
  await page.goto(`${ORIGIN}/dashboard?qaPlan=pro`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(quest => {
    localStorage.setItem('qa-saved-quests', JSON.stringify([quest]));
  }, DEMO_QUEST);
}

/** The creator, with the quiz stage open so the editor panel shows real work. */
async function shootCreator(browser) {
  const page = await browser.newPage({
    viewport: DESKTOP.viewport, deviceScaleFactor: DESKTOP.scale, locale: 'mk-MK',
  });
  await seedQuest(page);
  await page.goto(`${ORIGIN}/creator/${DEMO_QUEST.id}?qaPlan=pro`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Избери етапа 3/ }).click();
  await page.waitForLoadState('networkidle');
  // Leaflet tiles arrive over the network and fade in; without this the map
  // panel is captured half-drawn.
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(publicDir, 'screenshot-desktop.png') });
  await page.close();
}

/**
 * The player on the GPS stage — the intro stage is mostly empty space, so the
 * capture advances one step to the part that shows what the app is for.
 */
async function shootPlayer(browser) {
  const page = await browser.newPage({
    viewport: MOBILE.viewport, deviceScaleFactor: MOBILE.scale, locale: 'mk-MK',
    isMobile: true, hasTouch: true,
    geolocation: PLAYER_POSITION, permissions: ['geolocation'],
  });
  await seedQuest(page);
  await page.goto(`${ORIGIN}/play/${DEMO_QUEST.id}`, { waitUntil: 'domcontentloaded' });
  const dismiss = page.getByRole('button', { name: 'Сфатив' });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
  // Short on purpose: the HUD line-clamps the player name, and a longer one is
  // captured mid-truncation.
  await page.getByPlaceholder('Внесете го вашето име...').fill('Ана');
  await page.getByRole('button', { name: 'Започни Авантура' }).click();
  await page.getByRole('button', { name: /Разбрав, понатаму/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(publicDir, 'screenshot-mobile.png') });
  await page.close();
}

const server = spawn('npm', ['run', 'dev:qa'], { cwd: repoRoot, shell: true, stdio: 'ignore' });
let browser;
try {
  await waitForServer(`${ORIGIN}/dashboard?qaPlan=pro`);
  browser = await chromium.launch();
  await shootCreator(browser);
  await shootPlayer(browser);
  console.log(`screenshot-desktop.png  ${outputSize(DESKTOP)}`);
  console.log(`screenshot-mobile.png   ${outputSize(MOBILE)}`);
  console.log('Ако `scale` се смени, ажурирај ги и `sizes` во public/manifest.json.');
} finally {
  await browser?.close();
  server.kill();
}
