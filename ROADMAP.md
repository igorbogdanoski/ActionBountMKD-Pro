# АвантураКреатор — Roadmap

> Македонска алтернатива на Actionbound | Live: https://avantura.mismath.net

---

## ✅ ЗАВРШЕНО

### Phase 1 — Security Foundation
- [x] Firestore auth-based rules (замена на `allow all`)
- [x] Firebase credentials → `.env.local` (не во git)
- [x] `storage.ts` — типизиран без `any`, пагинација основа
- [x] `types.ts` — QuestResult, UserProfile, PLAN_LIMITS (Free/Starter/Pro/Enterprise)
- [x] `ErrorBoundary` компонент + wrapped `main.tsx`
- [x] `AuthContext` — popup → redirect fallback, error surface
- [x] TypeScript: 0 грешки

### Phase 2 — SaaS Architecture
- [x] React Router: `/`, `/dashboard`, `/creator`, `/play/:id`, `/pricing`
- [x] SEO: react-helmet-async, OpenGraph, Twitter Card, sitemap.xml, JSON-LD
- [x] `PlanGate` компонент + `usePlan` hook
- [x] `PricingPage`: Free / Starter 590MKD / Pro 1.490MKD / Enterprise
- [x] Code splitting: vendor chunks (1.9MB → 35-100KB кешабилни чанкови)

### Phase 2 — Deploy
- [x] GitHub: `igorbogdanoski/ActionBountMKD-Pro`
- [x] Vercel: production, auto-deploy на `git push main`
- [x] Custom domain: `avantura.mismath.net` (✅ Valid Configuration)
- [x] Firebase: нов проект `avanturakreator` на bogdanoskiigor@gmail.com
- [x] Firestore rules: deployирани преку Firebase Console

### Phase 2 — Quality
- [x] Sidebar: читливи бои, вистински план, type=button
- [x] BoundsDashboard: empty state CTA, live search, loading spinner, accessible modal
- [x] Zod validation (`src/lib/validation.ts`): XSS strip, GPS bounds, email normalize
- [x] Vitest: **24/24 тестови** — XSS, injection, GPS, feedback, email

---

## 🔜 PHASE 3A — Creator UX Rewrite (СЛЕДНО)

**Цел:** Да го достигнеме нивото на Actionbound Creator + да го надминеме.

### 3A.1 — Types.ts проширувања
- [ ] `Quest` + `category: QuestCategory`, `tags: string[]`, `playingTimeMinutes?: number`, `hasIntro: boolean`, `hasOutro: boolean`, `publicResults: boolean`
- [ ] `FindSpotStage` + `showMapMode: 'map' | 'arrow' | 'none'`, `requiredToAdvance: boolean`
- [ ] `QuizStage` + `requiredToAdvance: boolean`, `hintText?: string`
- [ ] Нов тип: `TournamentStage` (team competition stage)
- [ ] `QuestCategory` enum: `educational | cultural | teambuilding | tourism | personal | other`

### 3A.2 — Creator модуларизација
Тековниот `BoundCreator.tsx` (620+ линии) → разбиј на:

```
src/components/creator/
├── BoundCreator.tsx          ← shell: header, auto-save, layout
├── StageList.tsx             ← лев панел: sortable + INSERT меѓу stages
├── StageEditor.tsx           ← десен панел: tab-based editor dispatcher
├── QuestSettingsPanel.tsx    ← Quest-level: title, desc, category, tags, coords
├── stages/
│   ├── InfoStageEditor.tsx
│   ├── QuizStageEditor.tsx   ← табови: Quiz / Answer / Settings / Time limit
│   ├── MissionStageEditor.tsx
│   ├── FindSpotEditor.tsx    ← табови: Mission / Coordinate / Settings
│   ├── ScanCodeEditor.tsx
│   ├── SurveyEditor.tsx
│   └── TournamentEditor.tsx  ← НОВ
└── hooks/
    ├── useAutoSave.ts        ← debounced auto-save логика
    └── useQuestEditor.ts     ← useReducer за целата creator состојба
```

### 3A.3 — Нови Creator функции
- [ ] **Tab-based stage editor** (Mission / Coordinate / Settings / Time limit)
- [ ] **Insert stage** — `+` копче меѓу секои два stages (вметнување на позиција)
- [ ] **Duplicate stage** — копче на секој stage
- [ ] **Duplicate quest** — во Quest Settings / Danger Zone
- [ ] **Category** dropdown (Educational, Cultural, Team-building, Tourism, Personal)
- [ ] **Tags** input (comma-separated, max 10 тагови)
- [ ] **Playing time** — рачна проценка во минути
- [ ] **Intro / Outro** — checkbox за специјални stages (не бројат во редослед)
- [ ] **Public results** toggle — дали резултатите се јавни
- [ ] **Required to advance** — квиз мора да биде точен за да продолжи
- [ ] **Hint text** за Quiz stages
- [ ] **GPS Show mode** за Find Spot: Map / Arrow / None
- [ ] **Bound length** — auto-пресметување на растојание меѓу GPS точки
- [ ] **Tournament stage** — нов тип за team competition

### 3A.4 — useQuestEditor hook (useReducer)
Заменува 15+ useState во BoundCreator со типизиран reducer:
```ts
type Action =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'ADD_STAGE'; payload: { stageType: StageType; afterIndex: number } }
  | { type: 'DUPLICATE_STAGE'; payload: { stageId: string } }
  | { type: 'DELETE_STAGE'; payload: { stageId: string } }
  | { type: 'REORDER_STAGES'; payload: { oldIndex: number; newIndex: number } }
  | { type: 'UPDATE_STAGE'; payload: { stageId: string; updates: Partial<Stage> } }
  | { type: 'SET_SELECTED_STAGE'; payload: string | null }
  | { type: 'LOAD_QUEST'; payload: Quest }
```

### 3A.5 — Auto-save со debounce
```ts
// useAutoSave.ts — пишување само кога questot се сменил, со 2s debounce
```

---

## 🔜 PHASE 3B — Rich Text + Media

- [ ] **TipTap** rich text editor за descriptions (Bold, Italic, Image URL, YouTube embed, Audio)
- [ ] **Math formula** поддршка (KaTeX) за образовни квестови
- [ ] **Firebase Storage** — upload слики директно (наместо само URL)
- [ ] **GPX/KML Track upload** за рути

---

## 🔜 PHASE 3C — i18n + Stripe

### i18n
- [ ] `react-i18next` setup
- [ ] MK translations (default)
- [ ] EN translations
- [ ] Language switcher во Navbar (🇲🇰 / 🇬🇧)
- [ ] SEO: hreflang tags, EN sitemap

### Stripe
- [ ] Stripe Checkout за Starter + Pro
- [ ] Webhook за `checkout.session.completed` → update `user_profiles.plan`
- [ ] Portal за менаџмент на претплата
- [ ] `PlanGate` → реален план check post-payment

---

## 🔜 PHASE 4 — Advanced Features

- [ ] **Leaderboards** — per quest, global (само Pro+)
- [ ] **Switches** — conditional stage display
- [ ] **Analytics** — funnel, drop-off per stage, heatmap
- [ ] **Collaboration** — real-time co-editing (Firestore listeners)
- [ ] **Bound Factory** (Actionbound equivalent) — темплати од заедницата
- [ ] **Native app** — Capacitor wrapper за iOS/Android
- [ ] **White-label** за Enterprise

---

## 📊 Pricing vs Actionbound

| | Наш | Actionbound PRO |
|--|--|--|
| Цена | 590 MKD/мес | ~25 EUR/мес |
| Јазик | MK + EN | EN + 10 јазика |
| AI генерирање | ✅ | ❌ |
| GPS | ✅ | ✅ |
| QR | ✅ | ✅ |
| Rich text | ⏳ Phase 3B | ✅ |
| Tournament | ⏳ Phase 3A | ✅ |

---

## 🏗️ Техничка архитектура

```
Stack:     React 19 + TypeScript + Vite 6 + Tailwind 4
Backend:   Firebase Firestore + Auth + Storage
Auth:      Google OAuth (popup → redirect fallback)
Deploy:    Vercel (auto CI/CD) + avantura.mismath.net
Tests:     Vitest 24/24 (XSS, GPS, validation)
Security:  Zod schemas на сите влезни точки
Chunks:    vendor-react, vendor-firebase, vendor-maps, vendor-charts...
```

---

*Последно ажурирање: 2026-05-30*
