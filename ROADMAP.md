# АвантураКреатор — Roadmap

> Македонска алтернатива на Actionbound | Live: https://avantura.mismath.net

---

## ✅ ЗАВРШЕНО

### Phase 1 — Security Foundation
- [x] Firestore auth-based rules (замена на `allow all`)
- [x] Firebase credentials → `.env.local` (не во git)
- [x] `storage.ts` — типизиран без `any`, пагинација основа
- [x] `types.ts` — QuestResult, UserProfile, PLAN_LIMITS
- [x] `ErrorBoundary` + `AuthContext` (popup → redirect fallback)
- [x] TypeScript: 0 грешки, Vitest: 24/24

### Phase 2 — SaaS Architecture + Deploy
- [x] React Router: `/`, `/dashboard`, `/creator`, `/play/:id`, `/pricing`
- [x] SEO: react-helmet-async, OpenGraph, sitemap.xml, JSON-LD
- [x] PlanGate + usePlan hook + PricingPage (Free/Starter/Pro/Enterprise)
- [x] Code splitting: 1.9MB → 35-100KB chunks
- [x] GitHub + Vercel + `avantura.mismath.net` + Firebase `avanturakreator`
- [x] Sidebar UI fix + BoundsDashboard empty state + live search
- [x] Zod validation: XSS strip, GPS bounds, email normalize

### Phase 3A — Creator UX Rewrite ✅
- [x] types.ts: category, tags, TournamentStage, hasIntro/Outro, publicResults, requiredToAdvance
- [x] BoundCreator modularization: 9 components (StageList, StageEditor, QuestSettingsPanel...)
- [x] useQuestEditor (useReducer, 8 actions) + useAutoSave (2s debounce)
- [x] Tab-based stage editors: Quiz (4 tabs), FindSpot (3 tabs), + 5 others
- [x] INSERT stage button between each two stages
- [x] Duplicate stage per card
- [x] Category, Tags, Playing time, Intro/Outro, Public results, GPS Show mode
- [x] Tournament stage type (NEW)
- [x] ⚠️ Duplicate Quest (UI only) — minor, scheduled for later
- [x] ⚠️ Bound length auto-calc — minor, scheduled for later

### Phase 3B — Rich Text + KaTeX Math ✅
- [x] MathRichEditor: toolbar (B, I, $, $$), 4 symbol groups (×÷√π∑∫...)
- [x] Live KaTeX preview in creator
- [x] MathRenderer in MobilePlayer (all 6 stage description instances)
- [x] Integrated in QuizStageEditor + InfoStageEditor

### MobilePlayer Bug Fixes ✅
- [x] Bug 1 CRITICAL: Rules of Hooks violation (feedbackText/feedbackSubmitted)
- [x] Bug 2: Quiz number comparison always false (string vs number)
- [x] Bug 3: Cache key mismatch (actionbound- vs avanturakreator-)
- [x] Bug 4: window.location.href → useNavigate (full reload fixed)
- [x] Bug 5: TOURNAMENT stage missing render case
- [x] Bug 6: GPS watchPosition on ALL stages → only FIND_SPOT now

---

## ✅ PHASE 3B — Firebase Storage (image upload)

- [x] **Firebase Storage** — upload слики директно (наместо URL-only)
  - [x] `ImageUploader` компонент (drag & drop + progress + URL fallback)
  - [x] `storage` export во `firebase.ts`
  - [x] Integrate во `InfoStageEditor` (image media) + `QuestSettingsPanel` cover image
  - [x] `storage.rules` — owner-only write, public read, 5MB / image-only validation
  - [ ] ⚠️ Enable Storage во Firebase Console + `firebase deploy --only storage` (manual)
- [x] **Vitest fix** — Windows cmd lowercase-drive bug (`scripts/vitest.mjs` wrapper), 24/24 повторно

## ✅ PHASE 3B remaining

- [x] **GPX/KML Track upload** — рути за авантури
  - [x] `trackParser` util (GPX `trkpt/rtept/wpt` + KML `coordinates`/`gx:coord`, haversine должина, downsample за Firestore)
  - [x] `TrackUploader` компонент (drag & drop .gpx/.kml, валидација, статистика)
  - [x] Integrate во `QuestSettingsPanel` Мапи таб — auto должина/старт/цел; `track`/`trackName` во `Quest` type

---

## ✅ PHASE 3C — i18n + Stripe

### i18n ✅
- [x] `react-i18next` setup
- [x] `src/i18n/mk.json` — Македонски (default)
- [x] `src/i18n/en.json` — English
- [x] Language switcher во Sidebar (🇲🇰 / 🇬🇧)
- [x] Translate: LandingPage, Dashboard, Creator, Player, Pricing, Sidebar

### Плаќање — PayPal + Банкарски трансфер (MKD) ✅

> Stripe не е достапен во MK засега. Stripe API фајловите се зачувани за подоцна.

- [x] `src/config/payment.ts` — PayPal email, PayPal.me, банкарски детали, план износи, admin UIDs
- [x] `src/utils/paymentRequests.ts` — Firestore `payment_requests` CRUD
- [x] `src/components/pricing/PaymentModal.tsx` — 3-чекорен modal (метод → инструкции → потврда)
- [x] `PricingPage` — отвора PaymentModal наместо Stripe redirect
- [x] `src/components/admin/AdminPanel.tsx` — `/admin` страница за одобрување/одбивање барања
- [x] `firestore.rules` — `payment_requests` колекција + admin може да го смени `plan`
- [x] `vercel.json` — `/api/` исклучен (Stripe подготвен за подоцна)

  **Setup потребен (еднаш):**
  - [ ] Земи твојот Firebase UID (Firebase Console → Auth → Users)
  - [ ] Стави го во `src/config/payment.ts` → `adminUids` И во `firestore.rules` → `isAdmin()`
  - [ ] Ажурирај банкарски детали + PayPal во `src/config/payment.ts`
  - [ ] `firebase deploy --only firestore:rules` за да се применат новите правила

---

## 🔜 PHASE 4 — Advanced

- [ ] Leaderboards — per quest (само Pro+)
- [ ] Switches — conditional stage display
- [ ] Analytics — funnel, drop-off per stage
- [ ] Real-time collaboration — Firestore listeners
- [ ] Native app — Capacitor/Expo wrapper
- [ ] White-label — за Enterprise

---

## 📊 Pricing vs Actionbound

| | Наш | Actionbound PRO |
|--|--|--|
| Цена | 590 MKD/мес (~10€) | ~25 EUR/мес |
| Јазик | MK + EN (next) | EN + 10 јазика |
| AI генерирање | ✅ Gemini | ❌ |
| KaTeX математика | ✅ | ❌ |
| GPS + QR + Quiz | ✅ | ✅ |
| Tournament stage | ✅ | ✅ |
| Rich text editor | ⏳ Phase 3B | ✅ |
| Mobile app | ⏳ Phase 4 | ✅ |

---

## 🏗️ Техничка архитектура

```
Stack:     React 19 + TypeScript + Vite 6 + Tailwind 4
Backend:   Firebase Firestore + Auth + Storage (next)
Auth:      Google OAuth (popup → redirect fallback)
Deploy:    Vercel auto CI/CD + avantura.mismath.net
Tests:     Vitest 24/24 (XSS, GPS, validation, email)
Security:  Zod schemas + XSS stripHtml на сите влезни точки
Math:      KaTeX (creator + player)
Chunks:    vendor-react, firebase, maps, charts, motion, dnd, qr
```

---

*Последно ажурирање: 2026-05-30*
