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
| Phase 4C | Full Offline Mode (SW + queue sync) | 🔜 Следна |
| Phase 5 | Real-time Collab + Native App (Expo) + White-label | 📅 Планирана |

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

## 🔜 Phase 4C — Full Offline Mode

> **Целта:** Наставниците можат да ги преземат авантурите додека се на Wi-Fi и да ги играат без интернет во природа / надвор.

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

## 📅 Phase 5 — Enterprise & Scale

### 5A — Real-time Collaboration (Pro+)

**Firestore `game_sessions/` колекција:**
```typescript
interface GameSession {
  id: string;            // 6-char join code
  questId: string;
  hostId: string;
  players: { uid: string; name: string; points: number; stageIndex: number }[];
  status: 'waiting' | 'active' | 'finished';
  currentStageIndex: number; // broadcast mode
  createdAt: string;
}
```

- Join со 6-digit code (без auth за играчи)
- Firestore `onSnapshot` listeners за live updates
- Live leaderboard во играта
- Host контролира темпото (broadcast mode)

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
| Offline Mode | ⏳ Phase 4C | ✅ |
| Native App | ⏳ Phase 5B | ✅ |
| White-label | ⏳ Phase 5C | ✅ (Enterprise) |
| Real-time Collab | ⏳ Phase 5A | ✅ |

---

*Последно ажурирање: 2026-05-30 | Верзија: 4.2.0*
