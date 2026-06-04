# АВАНТУРА — Roadmap & Evidence Log

> **Македонска SaaS алтернатива на Actionbound**
> Live: https://avantura.mismath.net | Repo: https://github.com/igorbogdanoski/ActionBountMKD-Pro

---

## Статус на имплементација

| Фаза | Опис | Статус |
|------|------|--------|
| Phase 1 | Security Foundation + TypeScript | ✅ Завршена |
| Phase 2 | SaaS Architecture + Deploy | ✅ Завршена |
| Phase 3A | Creator UX Rewrite (modular) | ✅ Завршена |
| Phase 3B | Rich Text + KaTeX + Image/GPX Upload | ✅ Завршена |
| Phase 3C | i18n (MK/EN) + Payment (PayPal + Bank) | ✅ Завршена |
| Phase 4A | SWITCH Logic + Template Library + PlanWidget | ✅ Завршена |
| Phase 4B | Public Leaderboard + Funnel Analytics + Timer | ✅ Завршена |
| Phase 4C | Full Offline Mode (SW + queue sync) | ✅ Завршена |
| Phase 5A | Real-time Collaboration (game_sessions + onSnapshot) | ✅ Завршена |
| Phase 5B | Native App (Expo) — player, auth, push scaffold, maps | ✅ Завршена (dev) |
| Phase 5D | AI Quest Generator (GenerateQuestModal + aiService) | ✅ Завршена |
| Phase 5C / 5E | White-label + CSV→XLSX/scheduled export | 📅 Планирана |
| Phase 6 | PDF, PWA, Live Map, SOS, Inventory, Map DnD, Analytics | ✅ Завршена |
| **Phase 7** | **Пат до врвот — врвно EdTech искуство (педагогија + дизајн + полирање)** | 🚧 Во тек |

---

## ✅ Phase 1 — Security Foundation

**Commit:** `12cdd74` → `79e8283`

### Извршено
- Firestore auth-based security rules (замена на `allow all`)
- Firebase credentials извлечени во `.env.local` — никогаш во git
- `storage.ts` — целосно типизиран, без `any`, основа за пагинација
- `types.ts` — `QuestResult`, `UserProfile`, `PLAN_LIMITS`, `PlanId`
- `ErrorBoundary` за graceful crash handling
- `AuthContext` — Google OAuth со popup → redirect fallback (за мобил/Brave)
- Zod validation schemas: XSS stripHtml, GPS bounds check, email normalize
- TypeScript: **0 грешки** | Vitest: **24/24 тестови**

---

## ✅ Phase 2 — SaaS Architecture + Deploy

**Commit:** `500902d` → `ff9062d`

### Извршено
- React Router v7: `/`, `/dashboard`, `/creator`, `/play/:id`, `/pricing`, `/admin`
- Lazy loading + code splitting: 1.9MB → 35–100KB chunks
  - `vendor-react`, `vendor-firebase`, `vendor-maps`, `vendor-charts`, `vendor-motion`, `vendor-dnd`, `vendor-qr`
- SEO: `react-helmet-async`, OpenGraph, Twitter Card, JSON-LD `SoftwareApplication`, `sitemap.xml`
- `usePlan` hook + `PlanGate` компонента (feature gating)
- `PricingPage` — Free / Starter (590 MKD) / Pro (1490 MKD) / Enterprise
- Plan limits:

| | Free | Starter | Pro | Enterprise |
|-|------|---------|-----|-----------|
| Квестови | 3 | 15 | 100 | ∞ |
| Етапи/квест | 10 | 30 | 80 | ∞ |
| Играчи/квест | 20 | 100 | 500 | ∞ |
| CSV извоз | ✗ | ✓ | ✓ | ✓ |
| Соработка | ✗ | ✗ | ✓ | ✓ |
| AI | ✗ | ✓ | ✓ | ✓ |
| Јавно | ✗ | ✓ | ✓ | ✓ |

- GitHub CI/CD → Vercel → `avantura.mismath.net` (custom domain)
- Firebase project: `avanturakreator`
- `BoundsDashboard`: live search, empty state, quest cards

---

## ✅ Phase 3A — Creator UX Rewrite

**Commit:** `e195ee6`

### Извршено
- `BoundCreator.tsx` — модуларизиран на 9 компоненти
- `useQuestEditor` (useReducer, 8 акции): `LOAD`, `SET_FIELD`, `ADD_STAGE`, `DUPLICATE_STAGE`, `DELETE_STAGE`, `UPDATE_STAGE`, `REORDER_STAGES`, `SELECT_STAGE`
- `useAutoSave` — 2s debounce автоматско зачувување во Firestore
- 7 stage editors со табови (Quiz: 4 таба, FindSpot: 3 таба):
  - `InfoStageEditor`, `QuizStageEditor`, `MissionStageEditor`
  - `FindSpotEditor`, `ScanCodeEditor`, `SurveyEditor`, `TournamentEditor`
- INSERT копче помеѓу секои две етапи (hover reveal)
- Duplicate stage на секоја карта
- `QuestSettingsPanel` — таб за Профил, Карактеристики, Мапи, Danger Zone
- Fields: Category, Tags (max 10), Playing time, Intro/Outro, GPS show mode, Public results
- `StageList` — @dnd-kit drag-and-drop за реорганизација на етапи

### Stage типови
| Тип | Опис |
|-----|------|
| `INFO` | Медиа + текст (слика, видео, аудио) |
| `QUIZ` | Multiple choice / free text / estimate number + timer |
| `MISSION` | Фото / видео / аудио submission |
| `FIND_SPOT` | GPS навигација (map / arrow / none режим) |
| `SCAN_CODE` | QR код скенирање |
| `SURVEY` | Слободна форма, до 20 прашања |
| `TOURNAMENT` | Тимски натпревар, points/time/manual |
| `SWITCH` | *(Phase 4A)* Условна гранка |

---

## ✅ Phase 3B — Rich Text + KaTeX + Upload

**Commits:** `af76381`, `87a7360`, `5ac3877`

### KaTeX Math Editor
- `MathRichEditor` — toolbar (B, I, $, $$), 4 групи симболи (×÷√π∑∫...)
- Живо KaTeX preview во Creator
- `MathRenderer` во MobilePlayer — сите stage descriptions

### Image Upload
- `ImageUploader` — drag & drop + Firebase Storage + progress + URL fallback
- Storage rules: owner-only write, public read, 5MB лимит, image/* MIME
- Интегриран во `InfoStageEditor` + `QuestSettingsPanel` cover

### GPX/KML Track Upload
- `trackParser` util — GPX (`trkpt/rtept/wpt`) + KML (`coordinates`/`gx:coord`)
- Haversine должина + downsample за Firestore лимити
- `TrackUploader` компонента — drag & drop, валидација, статистика
- Auto-пополнување: должина / старт координати / цел координати

### MobilePlayer Bug Fixes (6 критични)
- Bug 1 (КРИТИЧЕН): Rules of Hooks violation — `feedbackText/feedbackSubmitted` дефинирани по early return
- Bug 2: Quiz `==` споредба string vs number — секогаш false за number answers
- Bug 3: Cache key mismatch (`actionbound-` vs `avanturakreator-`)
- Bug 4: `window.location.href` → `useNavigate` (full reload fix)
- Bug 5: TOURNAMENT stage — missing render case
- Bug 6: GPS `watchPosition` активен на СИТЕ stages → само на `FIND_SPOT`

---

## ✅ Phase 3C — i18n + Payment System

**Commits:** `eaa37d9`, `ba06dfa`, `dcc0dc9`

### i18n (react-i18next)
- Македонски (`mk.json`) — default јазик
- Англиски (`en.json`)
- Language switcher во Sidebar — pers. во localStorage
- Преведено: LandingPage, Dashboard, Creator, Player, Pricing, Sidebar

### Payment System (PayPal + Банкарски трансфер)
> Stripe не е достапен во Македонија — алтернативен flow

- `PaymentModal.tsx` — 3-чекорен modal: метод → инструкции → потврда
- `payment_requests` Firestore колекција
- `AdminPanel.tsx` — `/admin` за одобрување/одбивање на барања
- Поддржани методи: PayPal + NLB Банка (IBAN MK07 2105 0159 6102 457, BIC TUTNMK22)
- Admin UID: `YZyJNIyBeHVpuNaomr4tSVaDNY93` (конфигуриран во `payment.ts` И `firestore.rules`)

---

## ✅ Phase 4A — Core Value Features

**Commits:** `503f2f6`, `ceee608`

### 1. SWITCH / Условна гранка (Starter+)

- Нов stage тип `SWITCH` во `types.ts` — `SwitchCondition[]`, `defaultTargetStageId`, `showPathsToPlayer`
- `SwitchStageEditor.tsx` — UI за услови (minPoints, maxPoints, requiredStageIds, targetStage), fallback, visibility toggle
- `StageList.tsx` — GitBranch икона, violet боја
- `MobilePlayer.tsx`:
  - `evaluateSwitch()` — евалуација на услови vs `{totalPoints, completedStageIds}`
  - Auto-routing (silent) кога `showPathsToPlayer: false`
  - Интерактивни патишта (player choice) кога `showPathsToPlayer: true`
  - `useEffect` за auto-route кога се стигне на SWITCH stage

### 2. Динамична Библиотека со шаблони (Firestore-backed)

- **Firestore колекција `templates/`** со `Template` интерфејс:
  - `subject`, `grade`, `difficulty`, `estimatedMinutes`, `playMode`
  - `status: 'pending'|'approved'|'rejected'`
  - `isPublic`, `isFeatured`, `isPro`, `usageCount`, `ratingCount`
  - `stages: Stage[]` — целосни stage податоци (copy-on-use)
- `TemplatesLibrary.tsx` — целосно пренапишана:
  - Firestore fetch наместо hardcoded (6 → n шаблони)
  - Filter по предмет, difficulty badge, Featured badge, Pro badge
  - Favorites во localStorage
  - Pro+ modal за поднесување шаблони (pending → admin approval)
- `AdminPanel.tsx` — нов таб "Шаблони":
  - Листа на pending шаблони со approve/reject/featured toggle
  - **🌱 Seed копче** — додава 6 curated образовни шаблони директно
- `incrementTemplateUsage()` — tracking на употреба
- `storage.ts` — `getPublicTemplates()`, `getPendingTemplates()`, `saveTemplate()`, `deleteTemplate()`

### Seed шаблони (6 curated)

| # | Наслов | Предмет | Одд. | Посебност |
|---|--------|---------|------|-----------|
| 1 | Синтетичка геометрија во реалниот простор | Математика | 8 | GPS + Mission + Quiz |
| 2 | Процентополис — QR Авантура | Математика | 7 | QR кодови + таймер |
| 3 | Лов на екосистеми — Биологија | Природни науки | 6 | GPS + фото + аудио |
| 4 | Дигитален Времеплов — Историја | Историја | 9 | GPS рута + видео репортажа |
| 5 | Интерактивна Лектира — Storytelling | Јазици | 7-9 | **SWITCH** branching — два пата |
| 6 | Ориентационо трчање и здравје | Физичко | Сите | GPS спринт + Tournament |

### 3. PlanUsageWidget

- Прогрес бар (квестови искористени / максимум)
- Amber alert кога ≥80%, Rose кога на лимит
- Upgrade CTA за Free/Starter

### 4. Mobile Responsive Layout

- `DashboardLayout.tsx` — Sidebar скриен на мобил (< md)
- Hamburger меню со overlay drawer
- Mobile top bar со лого + меню копче

### 5. Bugfixes во оваа фаза

- **Template bug fix** — `App.tsx` callback ги игнорирал templateData; fix: route state `{ templateData: tpl }`; `BoundCreator.tsx` чита `useLocation().state`
- **robots.txt** — додаден во `public/`

---

## ✅ Phase 4B — Engagement Features

**Commit:** `503f2f6` (дел)

### 1. Јавна Табела со резултати (Pro+)

- **Нова рута** `/leaderboard/:questId` — без auth, јавна
- `PublicLeaderboard.tsx` — gold/silver/bronze badges, top 20, "Играј сега" CTA
- `QuestSettingsPanel.tsx` — toggle "Јавна табела" (lock badge за Free/Starter)
- `ShareModal.tsx` — amber-styled leaderboard линк кога е активиран
- `storage.ts` — `getPublicQuestResults()` (client-side sort)

### 2. Analytics Funnel (Pro+)

- `ResultsDashboard.tsx` — нов таб "📊 Аналитика":
  - Summary chips: вкупно играчи / % завршиле / критични падови
  - `BarChart` (Recharts) — completion rate % по етапа
  - Боење: зелено ≥70%, индиго, rose за пад >20%
  - Per-stage progress bars со ⚠ алерт
  - Lock страница за Free/Starter

### 3. Countdown Timer за Quiz

- Визуелен countdown (mm:ss + animated progress bar)
- Amber → rose боева промена кога ≤10 секунди
- Pulse анимација при ≤10s
- Auto-expire: `quizFeedback('error')` на `timeLeft === 0`
- "Продолжи →" копче по истекување (наместо блокирање)

---

## ✅ Infrastructure Fixes (post-4B)

### Firestore Security Rules (`firestore.rules`)
- Додадена `templates/` колекција: `read: true` (public), `write: isAdmin()`
- Сите composite `orderBy` queries замена со single `where` + client-side sort

### Vercel Cache Headers (`vercel.json`)
- `/assets/(.*)` → `Cache-Control: immutable, max-age=31536000`
- `/index.html` → `Cache-Control: no-cache, no-store, must-revalidate` ← **клучно**
- Го решава проблемот со 404 на JS chunks по секој deploy

### Dark Mode Fix (`index.css`)
- Tailwind v4 промени default dark mode на `prefers-color-scheme` media query
- Fix: `@variant dark (&:where(.dark, .dark *))` — class-based strategy

### Settings страница (`/settings`)
- Профил таб: editable display name (`updateProfile` + Firestore sync), email read-only, Google SSO badge
- Изглед таб: тема toggle (persisted), language switcher
- Сметка таб: план badge + лимити, member since, UID (за debug), logout
- Admin линк во Sidebar (само за adminUids)

### Admin Panel подобрувања
- "← Назад" копче во header
- Шаблони таб со seed, pending review, approve/reject/featured

---

## ✅ Phase 4C — Full Offline Mode

> **Целта:** Наставниците можат да ги преземат авантурите додека се на Wi-Fi и да ги играат без интернет во природа / надвор.

### Извршено
- `src/utils/offlineQueue.ts` — `saveOfflineResult`, `getOfflineQueue`, `clearOfflineQueue`, `offlineQueueSize`, `syncOfflineQueue`, `cacheQuestLocally`, `getCachedQuest`, `clearCachedQuest`, `isCachedLocally`
- `public/sw.js` v2 — CacheFirst за `/assets/*` и Firebase Storage медиуми (`av-media-v2`), NetworkFirst за HTML, `CACHE_MEDIA` message handler, SPA navigation fallback за офлајн refresh
- `src/main.tsx` — SW регистрација (само PROD) + `online` listener → `syncOfflineQueue()`
- `MobilePlayer.tsx` — load од кеш кога offline, queue при submit, online/offline индикатори, „☁ Преземи за офлајн" копче (quest JSON + media preload преку SW)
- `storage.ts` — `cacheQuestResources()` усогласен со `av-media-v2` + зачувува quest JSON локално

### Bugfixes (Offline review)
- **Cache-name mismatch** — индикаторот и `cacheQuestResources` читаа/пишуваа во застарен `avanturakreator-quest-*` cache што SW го брише; усогласени на `av-media-v2`
- **Dashboard „преземи" не зачувуваше quest JSON** — сега `cacheQuestResources()` повикува `cacheQuestLocally()`
- **SPA офлајн refresh** — додаден navigation fallback кон кеширан app shell во `sw.js`
- **2 TS грешки** во `MobilePlayer.tsx` (`handleNextStage` директно како `onClick`) → обвиткани во arrow

### Тестови
- `src/test/offlineQueue.test.ts` — 10 тестови (queue, sync success/partial, quest cache)
- TypeScript: **0 грешки** | Vitest: **34/34**

### Архитектура

```
MobilePlayer.tsx
  ├── на LOAD: cacheQuestToLocalStorage(quest)
  ├── при !navigator.onLine: loadQuestFromLocalStorage(questId)
  ├── при submit result + offline: saveOfflineResult(result) → localStorage queue
  └── при online event: syncOfflineResults() → Firestore

public/sw.js (нов)
  ├── INSTALL: cache app shell (index.html, main chunks)
  ├── ACTIVATE: cleanup стари caches
  ├── FETCH strategy:
  │   ├── /assets/* → CacheFirst (immutable hashed chunks)
  │   ├── /play/*   → NetworkFirst (fresh quest, fallback кеш)
  │   └── media (images, audio) → CacheFirst

src/utils/offlineQueue.ts (нов)
  ├── saveOfflineResult(result) → localStorage 'ab_offline_results'
  ├── getOfflineResults() → QuestResult[]
  ├── clearOfflineResults() → void
  └── syncOfflineResults() → push сè кон Firestore
```

### Имплементациски чекори

**Чекор 1: offlineQueue.ts**
```typescript
const KEY = 'ab_offline_results';
export function saveOfflineResult(r: Omit<QuestResult, 'id'>): void
export function getOfflineResults(): Omit<QuestResult, 'id'>[]
export function clearOfflineResults(): void
export async function syncOfflineResults(): Promise<number> // returns count synced
```

**Чекор 2: localStorage quest cache**
```typescript
// storage.ts
export function cacheQuestLocally(quest: Quest): void
export function getCachedQuest(questId: string): Quest | null
export function clearCachedQuest(questId: string): void
```

**Чекор 3: MobilePlayer логика**
```typescript
// При вчитување
const q = navigator.onLine
  ? await getQuestById(questId)   // network
  : getCachedQuest(questId);      // localStorage fallback

// При submit
if (navigator.onLine) {
  await saveQuestResult(result);
} else {
  saveOfflineResult(result);
  showOfflineToast("Резултатот ќе се синхронизира кога ќе се поврзеш.");
}

// Sync listener
window.addEventListener('online', () => syncOfflineResults());
```

**Чекор 4: Service Worker**
```javascript
// public/sw.js — NetworkFirst за HTML/quests, CacheFirst за assets/media
const SHELL_CACHE = 'av-shell-v1';
const MEDIA_CACHE = 'av-media-v1';
```

**Чекор 5: main.tsx — SW регистрација**
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

### Фајлови за промена
| Фајл | Промена |
|------|---------|
| `public/sw.js` | Целосен пренапис — NetworkFirst/CacheFirst стратегии |
| `src/main.tsx` | SW регистрација |
| `src/utils/storage.ts` | `cacheQuestLocally`, `getCachedQuest` |
| `src/utils/offlineQueue.ts` | **Нов** — offline result queue |
| `src/components/player/MobilePlayer.tsx` | Offline load + submit + sync |

### UX индикатори
- `☁` копче во player header → кешира квест за offline (постои, треба да се поврзе со new logic)
- `📵` banner кога offline
- `⏳` "Резултатот чека синхронизација" badge

---

## ✅ Phase 5A — Real-time Collaboration (Pro+)

> **Целта:** Наставникот хостира авантура во живо; учениците се приклучуваат со 6-знаков код (без логирање) и се натпреваруваат на табела што се ажурира во реално време.

### Извршено
- **`src/types.ts`** — `SessionStatus`, `SessionMode`, `SessionPlayer`, `GameSession`, `LeaderboardEntry` (doc id = 6-знаков join code)
- **`src/lib/session.ts`** (чиста логика, без I/O) — `generateJoinCode` (injectable rng, alphabet без O/0/I/L), `normalizeJoinCode`, `isValidJoinCode`, `upsertPlayer`, `removePlayer`, `applyProgress`, `computeLeaderboard` (поени ↓ → stageIndex ↓ → најрано join), `isSessionJoinable`, `canStartSession`, `sessionStats`, `clampBroadcastIndex`, `makeSessionPlayer`
- **`src/utils/sessionStorage.ts`** (Firestore I/O) — `createSession` (уникатен код со retry), `getSession`, `subscribeSession` (`onSnapshot`), `joinSession`/`leaveSession`/`updateProgress`/`setBroadcastStage` (атомично преку `runTransaction`), `setSessionStatus`, `deleteSession`, `SessionError`
- **`src/hooks/useGameSession.ts`** — subscribe по код → `{ session, leaderboard, stats, loading, notFound }`
- **`src/components/session/LiveSessionHost.tsx`** — host страница (`/host/:questId`, Pro+ gated): избор free/broadcast mode, join код + QR + копирање линк, live табела, старт/заврши, broadcast prev/next контроли
- **`src/components/session/JoinSession.tsx`** — јавна страница (`/join`, `/join/:code`): внес код+име → `joinSession` → рендер `MobilePlayer` со session props (стабилен анонимен player id во localStorage)
- **`src/components/player/MobilePlayer.tsx`** — нови props `sessionCode`/`sessionPlayerId`/`sessionPlayerName`; reporting на напредок (`updateProgress`) + follow на host темпо во broadcast mode
- **`src/App.tsx`** — рути `/host/:questId` (protected), `/join` + `/join/:code` (public)
- **`src/components/dashboard/BoundsDashboard.tsx`** — копче „Игра во живо" на quest картичка (Pro → `/host/:id`, инаку → `/pricing`)
- **`firestore.rules`** — `game_sessions/{code}`: јавно read; host-only create (`hostId == auth.uid`) + валидација; host full update ИЛИ анонимни играчи смеат да менуваат само `['players','updatedAt']` (≤500); host-only delete

### Архитектура
Чистата логика (`lib/session.ts`) е целосно одвоена од Firestore I/O (`utils/sessionStorage.ts`) за да биде unit-testable без backend, додека интеграциските тестови го покриваат целиот I/O слој преку in-memory Firestore mock.

### Тестови
- **`src/test/session.test.ts`** — 18 unit тестови (join кодови, roster, leaderboard tie-breaks, predicates, clamp)
- **`src/test/sessionStorage.test.ts`** — 12 интеграциски тестови (in-memory Firestore mock: целосен create→join→progress→broadcast→finish→snapshot e2e + code-collision retry, full/finished guards)
- TypeScript: **0 грешки** | Vitest: **64/64** | `vite build`: ✅

---

## ✅ Phase 5B — Native App (Expo / React Native) — Статус: IN PROGRESS

**Commit:** `df9def3` + uncommitted работа

### Извршено (2026-05-31)
- Expo SDK 56 + monorepo setup (`apps/mobile/`)
- Firebase Auth (email/лозинка) + AsyncStorage persistence
- EAS Build (development APK) — инсталиран и тестиран на Samsung SM-A556B
- Tab навигација: Почетна / Играј / Поставки
- Dashboard — листа на авантури од Firestore (свои + јавни)
- **Quest Player** — целосен порт на MobilePlayer:
  - INFO, QUIZ (multiple choice + free text + timer), FIND_SPOT (GPS),
    MISSION (фото + flip камера), SCAN_CODE (QR), SURVEY, SWITCH
  - Resume напредок (AsyncStorage)
  - Прескокни копче за тест режим
  - Зачувување резултат во Firestore
- metro.config.js за monorepo module resolution
- Firestore rules: `isPublic` поддршка за `isPublic == true`

### Тестирано (end-to-end, 2026-05-31)
| Етапа | Статус | Забелешка |
|-------|--------|-----------|
| INFO | ✅ | Слика + текст се прикажуваат |
| QUIZ (free text) | ✅ | Прескокни при погрешен одговор |
| MISSION (фото) | ✅ | Flip камера работи |
| FIND_SPOT (GPS) | ✅ | Прескокни (тест) при далечина |
| SCAN_CODE (QR) | ✅ | Прескокни достапно |
| SURVEY | ✅ | surveyQuestions поле читано |
| Финиш екран | ✅ | Поени + зачуван резултат |

---

## 🐛 Познати пропусти — за корекција (Phase 5B cleanup)

### Мобилна апликација

| # | Пропуст | Приоритет | Тест |
|---|---------|-----------|------|
| M1 | 🚧 Во тек — native Google Sign-In flow е внесен, `google-services.json` + `GoogleService-Info.plist` се внесени и Android SHA-linked OAuth client е конфигуриран; останува real-device dev/EAS build проверка | 🔴 Висок | E2E: логин со Google на Android build |
| M2 | ✅ Решено — dashboard разликува `Играј`, `Продолжи` и повторно отворање на завршена авантура | 🟡 Среден | E2E: заврши авантура → провери статус на картичка |
| M3 | ✅ Решено — dashboard header има стабилно закотвено `Поставки` quick action копче | 🟢 Низок | UI snapshot тест |
| M4 | ✅ Решено — mobile user-facing copy користи `Авантура`; `quest*` останува само како технички route/storage/backend surface | 🟢 Низок | String search тест |
| M5 | ✅ Решено — `quest/[id].tsx` користи `SafeAreaView` од `react-native-safe-area-context` | 🟢 Низок | Замени со `react-native-safe-area-context` |
| M6 | ✅ Решено — dashboard картичката има `Завршено` badge и визуелен completed state | 🟡 Среден | E2E: заврши → ✅ значка видлива |
| M7 | ✅ Решено — QUIZ multiple choice при грешка покажува `Прескокни` кога `requiredToAdvance` е false | 🟡 Среден | Unit: quizFeedback error + requiredToAdvance |
| M8 | ✅ Решено — dashboard list и quest detail имаат AsyncStorage cache fallback за offline режим | 🔴 Висок | E2E: offline режим |
| M9 | 🚧 Во тек — mobile registration scaffold, web self-test sender flow и EAS FCM V1 Google Service Account credential се внесени (`expo-notifications`, permission/token sync, Expo push send од Settings, Android FCM V1 key upload), но треба physical-device receive/tap верификација | 🟡 Среден | E2E: device push receive + tap deep-link |

### Веб апликација

| # | Пропуст | Приоритет | Тест |
|---|---------|-----------|------|
| W1 | "Уреди" копче отвора само Брзо уредување наместо `/creator?id=` | 🔴 Висок | E2E: клик Уреди → правилна навигација |
| W2 | Нема email/лозинка логин (само Google OAuth) | 🟡 Среден | E2E: login со live.com |
| W3 | GPS координати треба рачно внесување — нема "Земи моја локација" | 🟡 Среден | E2E: клик → auto-fill координати |
| W4 | `isPublic` поле не се пишува при креирање (само `visibility`) | 🟡 Среден | Unit: креирај квест → провери isPublic |
| W5 | Терминот "квест" наместо "авантура" на некои места | 🟢 Низок | String consistency тест |

### Следен EAS Build (треба за):
- `@react-native-google-signin/google-signin` (M1)
- `expo-notifications` (M9)
- `react-native-maps` (подобрување на FIND_SPOT)

---

## 📅 Phase 5 — Enterprise & Scale

### 5B — Native App (Expo / React Native)

> **Одлука:** Expo + React Native (не Capacitor) — побогато native UX на долг рок

**Стратегија:**
- Shared типови (`types.ts`) и Firebase конфигурација
- `apps/mobile/` — Expo app
- `packages/shared/` — заеднички utils/types
- Monorepo со Turborepo или Nx

**Native предности vs PWA:**
- Push notifications (нов квест, lease резултат)
- Background sync (offline results)
- Camera API без browser ограничувања
- App Store / Google Play distribution

**Имплементациски редослед:**
1. Expo setup + Firebase config
2. Auth screen (Google + Email)
3. Quest browse + play screens (port од MobilePlayer)
4. Offline-first со Expo SQLite
5. Push notifications (Expo Notifications)
6. App Store submission

### 5C — White-label (Enterprise)

**Цел:** Општини, школи, туристички агенции со свој брендиран build

- `white_label_configs/` Firestore колекција
- Custom domain per tenant (`*.avantura.net`)
- Custom logo, colors, fonts во runtime
- Per-tenant Firestore namespace (`tenants/{tenantId}/quests/`)
- Admin dashboard за tenant management

### 5D — AI Quest Generator (Starter+)

- Gemini API (`@google/genai` — веќе инсталиран)
- "Генерирај квест" modal: тема + одделение + предмет + број етапи
- Auto-generates `Quest` со stage содржина + KaTeX математика
- Preview + edit пред зачувување

### 5E — CSV Export подобрување (Starter+)

> CSV извозот постои. Подобрувања:

- Вклучи completion rate % по етапа
- Per-player stage breakdown
- Excel-compatible `.xlsx` наместо CSV (SheetJS)
- Scheduled export (email report weekly)

---

## 🚧 Phase 6 — Engagement & Field Tools

> **Целта:** Да се претвори авантурата од „веб-страна со мапа" во моќна EdTech платформа со награди, безбедност на терен и алатки за надзор во живо. Извор: експертска анализа (UI/UX + EdTech) спротиставена со постоечкиот код.

### Преглед на приоритети

| Под-фаза | Функција | Тип | Вредност | Труд | Приоритет |
|----------|----------|-----|----------|------|-----------|
| 6A | PDF Сертификати/беџови | 🆕 Ново | Висока | Низок | 🔴 1 |
| 6B | PWA икони (192/512 PNG) + Add-to-Home промпт | 🟡 Подобри | Висока (Play Store) | Низок | 🔴 2 |
| 6C | Жива мапа со позиции на тимови (Live Monitor) | 🟡/🆕 | Висока | Среден | 🟡 3 |
| 6D | SOS / Панично копче | 🆕 Ново | Висока (безбедност) | Низок | 🟡 4 |
| 6E | Инвентар (виртуелни предмети) | 🆕 Ново | Средна | Среден | 🟢 5 |
| 6F | Drag-and-Drop на точки директно на мапа (Creator) | 🟡 Подобри | Средна | Среден | 🟢 6 |
| 6G | Продукт аналитика (PostHog/GA drop-off funnel) | 🆕 Ново | Средна | Низок | 🟢 7 |

> Веќе постои (не се повторува): per-stage funnel analytics (`ResultsDashboard`), offline mode, аудио водич (`audioUrl`), фото-доказ (`answerType: 'photo'`), QR/SCAN, SWITCH branching, leaderboard, real-time session.

---

### 6A — PDF Сертификати/беџови ✅

**Цел:** По завршување на авантура, играчот добива персонализиран PDF сертификат (име, наслов на авантура, поени, датум).

- Библиотека: `jspdf` (lightweight, без backend; lazy-loaded chunk)
- `src/utils/certificate.ts` — `generateCertificate({ playerName, questTitle, score, maxScore, date })` → PDF blob/download
- Брендиран дизајн: корал/кафена палета, лого, рамка, „Авантура" cursive наслов
- Интеграција во **финиш екранот** на `MobilePlayer.tsx` — копче „📜 Преземи сертификат"
- Опционално: toggle во `QuestSettingsPanel` „Овозможи сертификат" + custom потпис/организација
- Достапност по план: Free = со watermark; Starter+ = чист брендиран

**Статус:** завршено и валидирано — Canvas-рендер (Cyrillic-safe) → jsPDF A4 landscape; копче „Преземи сертификат" на финиш екранот; `QuestSettingsPanel` toggle „Сертификат за завршување" со plan-based watermark (`certificateEnabled` + `certificateWatermark`)

**Фајлови:** `src/utils/certificate.ts` (нов), `MobilePlayer.tsx`, `QuestSettingsPanel.tsx`, `types.ts` (`certificateEnabled`, `certificateWatermark`)

---

### ✅ 6B — PWA икони + Add-to-Home

**Цел:** Вистинско „апликациско" чувство на мобилен + предуслов за Play Store / TWA.

### Извршено
- `scripts/gen-icons.mjs` — pure-Node.js PNG encoder (без надворешни зависности); генерира брендирани икони со корал позадина + бело „layers" лого
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `public/apple-touch-icon.png` — генерирани
- `public/manifest.json` — ажуриран со 4 `icons` записи (`purpose: any` + `purpose: maskable`), `orientation`, `categories`, подобрен `description`
- `index.html` — додадени PNG `<link rel="icon">` + `<link rel="apple-touch-icon" sizes="180x180">`, исправен viewport (отстранет `user-scalable=no` за a11y)
- `src/components/InstallPrompt.tsx` (нов) — фаќа `beforeinstallprompt`, дискретен bottom banner по 3s; dismiss со localStorage cooldown (7 дена); не се прикажува ако веќе инсталирано (standalone/iOS)
- `src/index.css` — `@keyframes slide-up` анимација за banner
- `src/App.tsx` — `<InstallPrompt />` монтиран глобално
- TypeScript: **0 грешки**

**Фајлови:** `public/icon-*.png` (нови), `public/manifest.json`, `index.html`, `src/index.css`, `src/components/InstallPrompt.tsx` (нов), `src/App.tsx`, `scripts/gen-icons.mjs` (нов)

---

### 6C — Жива мапа во Live Monitor ✅

**Цел:** Наставникот на излет со 30 деца да гледа каде е секој тим во реално време.

- Прошири `SessionPlayer` со `lastLat`, `lastLng`, `lastSeenAt`
- Играч (`MobilePlayer` во session mode) праќа GPS позиција (throttle ~10s) во `game_sessions/{code}.players`
- `LiveSessionHost.tsx` — додади Leaflet мапа со маркери по тим (боја/иницијал) покрај постоечкиот leaderboard
- Privacy: позиции само додека сесијата е активна; се чистат на finish

**Фајлови:** `types.ts`, `lib/session.ts` (`applyLocation`), `sessionStorage.ts`, `MobilePlayer.tsx`, `LiveSessionHost.tsx`

---

### 6D — SOS / Панично копче ✅

**Цел:** Тим што се изгубил/има проблем со еден клик ја испраќа точната локација на наставникот.

- Копче „🆘 SOS" во `MobilePlayer` (видливо само во session mode)
- Запишува `sosAlerts[]` во `game_sessions/{code}` со `{ playerId, lat, lng, ts }`
- `LiveSessionHost` — црвен alert banner + zoom на мапата кон тимот (зависи од 6C)

**Фајлови:** `types.ts`, `lib/session.ts` (`raiseSos`/`clearSos`), `sessionStorage.ts`, `MobilePlayer.tsx`, `LiveSessionHost.tsx`

---

### 6E — Инвентар (виртуелни предмети) ✅

**Цел:** Играчите „собираат" предмети на локации кои подоцна се потребни за финална загатка (gamification 2.0).

- `types.ts` — `InventoryItem` (`id`, `name`, `icon`, `mediaUrl`); stage може да `grantsItemId`; `SWITCH`/задача може да `requiresItemId`
- Creator UI — додавање предмети во `QuestSettingsPanel` + избор „доделува/бара предмет" во stage editors
- `MobilePlayer` — инвентар лента/торба; gating на задачи кои бараат предмет
- Состојба во resume (AsyncStorage/localStorage)

**Статус:** завршено и валидирано (`tsc --noEmit`, `213/213` web тестови зелени)

**Фајлови:** `types.ts`, `QuestSettingsPanel.tsx`, stage editors, `MobilePlayer.tsx`

---

### 6F — Drag-and-Drop точки на мапа (Creator) ✅

**Цел:** Наставникот да поставува/реди GPS точки визуелно на мапа, не само листа.

- Прошири `MapSelector` со повеќе маркери (drag за позиција) + клик-за-додавање
- Синхронизација со `FIND_SPOT` stages (lat/lng) и редослед
- Опционално: цртање рута (polyline) меѓу точки

**Статус:** завршено и валидирано (`tsc --noEmit`, `217/217` web тестови зелени)

**Фајлови:** `MapSelector.tsx`, `BoundCreator.tsx`, `FindSpotEditor.tsx`

---

### 6G — Продукт аналитика ✅

**Цел:** Каде корисниците се откажуваат (product-level, не само per-quest).

- PostHog (self-host friendly) или GA4
- Event tracking: `quest_start`, `stage_complete`, `quest_finish`, `signup`, `upgrade_click`
- Env-gated (`VITE_POSTHOG_KEY`), без PII, со consent
- Dashboard funnel во PostHog

**Статус:** завршено и валидирано (`tsc --noEmit`, `221/221` web тестови зелени)

**Фајлови:** `src/utils/analytics.ts` (нов), `main.tsx`, клучни точки во `MobilePlayer`/`PricingPage`

---

### Редослед на имплементација (Phase 6)
1. **6A** PDF Сертификати ✅
2. **6B** PWA икони + Add-to-Home ✅
3. **6C** Жива мапа + **6D** SOS (заедно — делат session GPS) ✅
4. **6E** Инвентар ✅
5. **6F** Map DnD ✅
6. **6G** Analytics ✅

---

## 🏆 Phase 7 — Пат до врвот (Top-tier EdTech)

> **Визија:** Да ја направиме АВАНТУРА **најдобрата македонска платформа од овој вид** — со врвно педагошко, професионално и дизајнерско искуство подеднакво за **наставниците (креатори)** и за **учениците (играчи)**, и за сите останати корисници (родители, општини, музеи, туристички агенции).
>
> **Принцип:** „Playful Professional" — пријателски и моќен. Секоја одлука се мери според три оски: (1) **педагошка вредност**, (2) **професионален/доверлив изглед**, (3) **квалитет на дизајн и UX**.
>
> *Извор: експертска EdTech + UI/UX анализа спротиставена со постоечкиот код и live `avantura.mismath.net`.*

### Преглед на приоритети

| Под-фаза | Тема | Фокус | Вредност | Приоритет | Статус |
|----------|------|-------|----------|-----------|--------|
| 7A | Доверба и усогласеност (Privacy/Terms, Footer, контакт) | Сите | Висока (Play Store + училишта) | 🔴 1 | ✅ |
| 7B | Полирање на почетна страна + SEO длабочина | Маркетинг/конверзија | Висока | 🔴 2 | ✅ |
| 7C | Унифициран дизајн систем + брендирање | Дизајн | Висока | 🟡 3 | 🚧 |
| 7D | Педагошки слој за наставници | Наставник | Висока | 🟡 4 | ✅ |
| 7E | Искуство и пристапност за ученици | Ученик | Висока | 🟡 5 | ⬜ |
| 7F | Мобилна апликација → Play Store | Дистрибуција | Висока | 🟡 6 | ⬜ |
| 7G | SaaS зрелост (billing, е-маил, white-label) | Бизнис | Средна | 🟢 7 | ⬜ |
| 7H | Квалитет и набљудување (e2e, Sentry, dynamic sitemap) | Инженеринг | Средна | 🟢 8 | ⬜ |

---

### 7A — Доверба и усогласеност ✅

**Цел:** Професионален footer, правни страници и контакт — предуслов за Play Store, GDPR и усвојување во училишта.

- Footer компонента (навигација, контакт `igor.bogdanoski@mismath.net`, социјални, јазик, copyright)
- `/privacy` — Политика на приватност (локација, камера, податоци на ученици, малолетници)
- `/terms` — Услови на користење
- Линкови во footer + во `InstallPrompt`/registration; privacy URL за Play Data Safety
- noindex за правните не е потребно — треба да се индексираат

**Фајлови:** `src/components/layout/Footer.tsx` (нов), `src/components/legal/PrivacyPolicy.tsx` (нов), `src/components/legal/TermsOfService.tsx` (нов), `App.tsx`, `LandingPage.tsx`, `robots.txt`, `sitemap.xml`

---

### 7B — Почетна страна + SEO длабочина ✅

**Цел:** Повисока конверзија и реална индексабилна содржина.

- Footer на сите јавни страници; јазичен прекинувач (MK/EN) на landing (i18n веќе постои)
- Динамичен `sitemap.xml` со јавни авантури + поправка на лажните `/en/` hreflang
- `manifest.screenshots` за богат install prompt / TWA
- Унифициран бренд: одлучи „Авантура" наспроти „АвантураКреатор" низ `index.html`, `SEO.tsx`, `manifest.json`
- Реален демо квест зад „Пробај демо" (наместо хардкодиран `/play/demo-quest-123`)
- Секција „Како функционира" со кратко видео/GIF; per-page JSON-LD (FAQPage за FAQ)

**Фајлови:** `LandingPage.tsx`, `SEO.tsx`, `index.html`, `public/manifest.json`, `public/sitemap.xml`, демо seed

---

### 7C — Дизајн систем + брендирање 🚧

**Цел:** Конзистентен, заоблен, пријателски, но професионален изглед („Playful Professional").

- ✅ **7C-1** Типографија + дизајн токени — Quicksand (UI) + Pacifico (бренд) глобално вчитани во `index.html`; `@theme` токени во `index.css` (брend-палета `brand-50..950`, `--font-sans`/`--font-brand`, радиуси, меки сенки); отстранети дупли inline `@import` на Pacifico низ компонентите
- **7C-2** Заедничка UI библиотека (Button, Card, Toggle, Badge, Modal) — реупотреба во creator + player + landing
- **7C-3** Refactor на екраните да користат токени/UI (замена на хардкодираниот `#e66c4f` со `brand-*`)
- Векторски илустрации/иконографија конзистентни

**Фајлови:** `index.html` ✅, `src/index.css` ✅, `src/components/ui/*` (нов), refactor низ постоечките екрани

---

### 7D — Педагошки слој за наставници ✅

**Цел:** Од „едитор на игри" во вистинска наставна алатка.

- ✅ **7D-1** Цели на учење + предмет/одделение/курикулумска ознака по авантура — нов таб „Педагогија" во поставките, приказ во „Резултати и Аналитика" + во CSV извоз
- ✅ **7D-2** Рубрики и насочена повратна информација за рачно оценети задачи (MISSION/SURVEY) — `RubricEditor` (критериуми, нивоа, брзи коментари) во едиторите; read-only „Како се оценува" приказ кај играч; `rubricMaxPoints` + тестови
- ✅ **7D-3** Класови/групи: именувани групи ученици + доделување авантури — нов таб „Класови" (`ClassGroups`), `class_groups` колекција + owner-scoped Firestore rules, CRUD во `storage.ts`, помошници `groupAssignedCount`/`isStudentNameTaken` + тестови (преглед по ученик чека персистенција на поднесоци)
- ✅ **7D-4** Извоз на оцени по ученик + сертификати по класа — CSV дневник (поени по ученик×авантура, вкупно/завршени) во „Класови"; multi-page PDF сертификати за класа (`downloadClassCertificates`); чисти помошници `buildClassGradebook`/`bestResultForName`/`questMaxScore`/`normalizePlayerName` + тестови
- ✅ **7D-5** Филтри по предмет/одделение во dashboard-от (надгради на 7D-1) — чист `questMatchesPedagogy` помошник (третира одделение „Сите" како универзално совпаѓање); два падачки филтри (предмет/одделение) во `BoundsDashboard`; педагошки беџови на картичките; i18n (mk/en) + тестови
- Опц.: Google Classroom „доделено како задача"
- Библиотека на педагошки шаблони по предмет (надгради на постоечките seed шаблони)

**Фајлови:** `types.ts` (`QuestPedagogy`, `EDUCATION_SUBJECTS`, `EDUCATION_GRADES`, `questMatchesPedagogy`) ✅, `QuestSettingsPanel.tsx` ✅, `ResultsDashboard.tsx` ✅, `ClassGroups.tsx` ✅, `BoundsDashboard.tsx` ✅, `class_groups` модел + rules ✅

---

### 7E — Искуство и пристапност за ученици ⬜

**Цел:** Мотивирачко, инклузивно, безбедно искуство за Генерација Алфа.

- Онбординг + охрабрувачки микро-копии, прогрес визуелизација, систем на помошни траги (hints)
- A11y: контраст, фокус-стилови, ARIA, читливост на сонце (high-contrast outdoor mode)
- Беџови/постигнувања и инвентар прикази (надгради на 6E), празнични анимации без претерување
- Безбедност: јасни дозволи, SOS видлив (6D), приватност на име/локација

**Фајлови:** `MobilePlayer.tsx`, нови `ui/*`, a11y audit

---

### 7F — Мобилна → Google Play ⬜

**Цел:** Објавена, стабилна Android апликација.

- Реален идентитет: `app.json` `name`/`slug` → „Авантура" (моментално „mobile")
- `google-services.json` како EAS file-secret (моментално ГО НЕМА на диск)
- `production` profile → AAB; `eas submit`; верификација M1 (Google login) + M9 (push) на реален уред
- Store листинг: feature graphic, screenshots, опис, Privacy URL (од 7A), Data Safety форма
- Алтернатива: TWA обвивка околу PWA како побрз пат

**Фајлови:** `apps/mobile/app.json`, `eas.json`, EAS secrets, store assets

---

### 7G — SaaS зрелост ⬜

- Автоматски billing (Stripe за EU) + lifecycle (обнова/истек) наспроти тековното рачно `payment_requests`
- Транзакциски е-маил (потврда, фактура, потсетници)
- White-label (5C): per-tenant брендирање/домен за општини/училишта/агенции
- XLSX извоз + completion rate по етапа + scheduled weekly report (5E)

**Фајлови:** Cloud Functions, `aiService`/email util, `white_label_configs`, export utils

---

### 7H — Квалитет и набљудување ⬜

- E2E (Playwright) за критични текови: креирај → играј → резултат → live сесија
- Error monitoring (Sentry) web + mobile; евидентирање на 4B/4C мануелните тест-планови
- Динамичен sitemap аутоматизација; Lighthouse буџет (<2s, a11y ≥95)

**Фајлови:** `e2e/*`, Sentry init, CI чекор

---

### Редослед на реализација (Phase 7)
1. **7A** Доверба/усогласеност (Footer + Privacy + Terms) — ✅ завршено
2. **7B** Почетна + SEO длабочина — ✅ завршено
3. **7C** Дизајн систем
4. **7D** Педагошки слој (наставник) + **7E** Ученичко искуство (паралелно)
5. **7F** Play Store
6. **7G** SaaS зрелост + **7H** Квалитет

---

## 🧪 Testing Plan — Phase 4B

### Public Leaderboard

| Тест | Очекување | Статус |
|------|-----------|--------|
| Отвори `/leaderboard/[validId]` без login | Страница се прикажува | ⬜ |
| Отвори `/leaderboard/[invalidId]` | "Табелата не е достапна" | ⬜ |
| Creator → Поставки → Карактеристики → "Јавна табела" (Free plan) | Lock badge, не може да вклучи | ⬜ |
| Creator → Поставки → "Јавна табела" (Pro plan) | Toggle работи | ⬜ |
| Share modal со активна табела | Amber линк за leaderboard видлив | ⬜ |
| Одигraj квест → провери дека играчот се гледа на `/leaderboard/:id` | Играч во листата | ⬜ |
| Повеќе играчи → редослед по поени | Точен ranking | ⬜ |

### Analytics Funnel

| Тест | Очекување | Статус |
|------|-----------|--------|
| ResultsDashboard → таб "📊 Аналитика" (Free plan) | Lock страница | ⬜ |
| ResultsDashboard → таб "📊 Аналитика" (Pro plan) | Funnel chart видлив | ⬜ |
| Квест со 0 резултати | "Нема доволно податоци" | ⬜ |
| Квест со резултати → completion % | Точна пресметка (plays[i]/plays[0]*100) | ⬜ |
| Етапа со >20% пад | Червена боја + ⚠ алерт | ⬜ |
| Summary chips | Вкупно играчи / % завршиле / критични падови точни | ⬜ |

### Countdown Timer

| Тест | Очекување | Статус |
|------|-----------|--------|
| Quiz без `timeLimitSeconds` | Нема timer | ⬜ |
| Quiz со `timeLimitSeconds: 30` | Countdown видлив, amber | ⬜ |
| Quiz со `timeLimitSeconds: 30`, чекај 20s | Timer → rose + pulse | ⬜ |
| Quiz — истечи времето | Auto-error, "Времето истече!", "Продолжи →" копче | ⬜ |
| Quiz — точен одговор пред крај | Нормален flow, точни поени | ⬜ |

### SWITCH Stage

| Тест | Очекување | Статус |
|------|-----------|--------|
| Додај SWITCH (Free plan) | Блокирано (Starter+ gate) | ⬜ |
| Додај SWITCH (Starter plan) | Достапно | ⬜ |
| Услов minPoints: 50, играч со 80 → | Оди кон target stage | ⬜ |
| Услов minPoints: 50, играч со 30 → | Оди кон defaultTarget | ⬜ |
| showPathsToPlayer: true | Играчот гледа и бира патека | ⬜ |
| showPathsToPlayer: false | Автоматски роутинг | ⬜ |

---

## 🧪 Testing Plan — Phase 4C (Offline Mode)

> Тестирање на мобилен уред (Chrome DevTools → Network → Offline)

### Offline Quest Load

| Тест | Очекување | Статус |
|------|-----------|--------|
| Отвори квест online → кеш се зачувува | LocalStorage клуч постои | ⬜ |
| Оди offline → отвори ист квест | Квестот се вчитува од кеш | ⬜ |
| Оди offline → отвори квест кој НЕ е кеширан | Error порака "Потребна е конекција" | ⬜ |
| ☁ копче во player → кешира сите медиа | CloudOff → Cloud иконка | ⬜ |

### Offline Result Queue

| Тест | Очекување | Статус |
|------|-----------|--------|
| Оди offline → заврши квест | "Ќе се синхронизира" toast | ⬜ |
| Резултатот во localStorage queue | `ab_offline_results` постои | ⬜ |
| Поврзи се online | Резултатот автоматски synced | ⬜ |
| Провери Firestore | Резултатот е зачуван | ⬜ |
| Повеќе offline резултати → sync сите | Сите доаѓаат во Firestore | ⬜ |

### Service Worker

| Тест | Очекување | Статус |
|------|-----------|--------|
| DevTools → Application → SW | SW регистриран | ⬜ |
| Hard refresh → SW уште активен | Не се брише | ⬜ |
| Offline → `/play/:id` | Квестот работи (ако е кеширан) | ⬜ |
| Нова deploy → SW се ажурира | Нов кеш, без 404 | ⬜ |

---

## 🏗️ Техничка архитектура

```
Frontend:   React 19 + TypeScript 5.8 + Vite 6.2
Styling:    Tailwind CSS 4.1 (class-based dark mode via @variant)
Backend:    Firebase Firestore + Auth + Storage
Auth:       Google OAuth (popup → redirect fallback)
Deploy:     Vercel (auto CI/CD) + avantura.mismath.net
i18n:       react-i18next — mk (default) + en
Math:       KaTeX 0.17 + react-katex
Charts:     Recharts 3.8
Maps:       React Leaflet + Leaflet
DnD:        @dnd-kit (sortable stages)
Animation:  Motion (Framer Motion v12)
QR:         html5-qrcode (scan) + qrcode.react (generate)
Validation: Zod 4.4
Tests:      Vitest 24/24
Payment:    PayPal + NLB Банкарски трансфер (Stripe резервиран за EU)
```

### Firestore колекции

| Колекција | Опис | Пристап |
|-----------|------|---------|
| `quests/` | Quest документи | Owner/collaborator/public |
| `quest_results/` | Резултати од играчи | Public create, auth read |
| `quest_feedback/` | Feedback по квест | Public create, auth read |
| `user_settings/` | Тема, поставки | Owner only |
| `user_profiles/` | Plan, subscription | Owner + admin |
| `payment_requests/` | Барања за плаќање | Owner create, admin read/update |
| `templates/` | Библиотека шаблони | Public read, admin write |
| *(Phase 5)* `game_sessions/` | Real-time collab | Player create/read |

### Chunk стратегија (Vite)

| Chunk | Содржина | Големина (gzip) |
|-------|---------|-----------------|
| `vendor-react` | React + Router + DOM | ~17 KB |
| `vendor-firebase` | Firebase SDK | ~109 KB |
| `vendor-maps` | Leaflet + React-Leaflet | ~45 KB |
| `vendor-charts` | Recharts | ~106 KB |
| `vendor-motion` | Framer Motion | ~32 KB |
| `vendor-dnd` | dnd-kit | ~15 KB |
| `vendor-qr` | html5-qrcode + qrcode.react | ~117 KB |
| `katex.min` | KaTeX | ~78 KB |
| `BoundCreator` | Creator editor | ~16 KB |
| `MobilePlayer` | Player | ~11 KB |

---

## 🗺️ Конкурентска споредба

| Функционалност | АВАНТУРА | Actionbound PRO |
|----------------|----------|-----------------|
| Цена | 590 MKD/мес (~10€) | ~25 EUR/мес |
| Јазик | MK + EN | EN + 10 јазика |
| KaTeX математика | ✅ | ❌ |
| SWITCH условна логика | ✅ | ✅ |
| GPS навигација | ✅ | ✅ |
| QR скенирање | ✅ | ✅ |
| GPX/KML рути | ✅ | ✅ |
| Tournament stage | ✅ | ✅ |
| Funnel Analytics | ✅ (Pro+) | ✅ |
| Public Leaderboard | ✅ (Pro+) | ✅ |
| AI генерирање | ⏳ Phase 5D | ❌ |
| Offline Mode | ✅ Phase 4C | ✅ |
| Native App | ⏳ Phase 5B | ✅ |
| White-label | ⏳ Phase 5C | ✅ (Enterprise) |
| Real-time Collab | ✅ Phase 5A (Pro+) | ✅ |

---

*Последно ажурирање: 2026-06-02 | Верзија: 7.0.0 (Phase 6 завршена, Phase 7 во тек)*
