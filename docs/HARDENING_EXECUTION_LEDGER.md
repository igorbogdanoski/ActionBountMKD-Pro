# Авантура МКД Pro — Hardening Execution Ledger

> Траен извор на вистина за преостанатото техничко, визуелно и педагошко зацврстување. Се ажурира по секој затворен batch.

**Креирано:** 2026-07-17

**Гранка:** `main`

**Последна потврдена основа:** `8147394`

**Правило за push:** само по експлицитна потврда од сопственикот.

## Мисија

Производот да стигне до регионален best-in-class EdTech SaaS квалитет за училишта и институции, со безбедни промени, мерливи проверки и без големи непроверливи миграции.

## Непреговарачки правила

1. Еден batch опфаќа мал, логички поврзан обем; по правило најмногу 10 production фајла.
2. Пред и по секој batch: `tsc --noEmit` и целиот Vitest suite.
3. За визуелни промени: browser QA на desktop и mobile; light/dark каде што е применливо.
4. Не се мешаат Button и Card миграции во ист batch.
5. Не се менува палета, типографија, геометрија или semantics како несакан ефект од миграција.
6. `primary` е coral marketing action; `app-primary` е indigo application action.
7. Pro/paywall data fetch мора директно да го проверува plan gate-от, не само UI-то.
8. Нов render test што транзитивно внесува Firebase мора да го mock-ира `utils/firebase` пред import-от.
9. Секој затворен batch добива сопствен commit. Push не се прави без потврда.
10. Постоечките кориснички промени во worktree се чуваат и не се вклучуваат во нашите commit-и.

## Потврдена состојба

- Button/Card API prerequisite е завршен во `2b135d3`.
- Playwright MCP конфигурацијата е versioned во `8147394`.
- Production Button миграцијата е завршена низ H1, H2 и H3a-H3c; H3d-H3f остануваат. Card миграцијата не е започната.
- Инвентар: 232 raw `<button>` појавувања во 51 component TSX фајл.
- TypeScript baseline на 2026-07-17: PASS.
- Full-suite baseline на 2026-07-17: 55/55 test files, 472/472 tests PASS (`--maxWorkers=1`, 110.71 s).
- Suite-от не бил заглавен; Windows/jsdom startup и немањето streaming output го направиле run-от да изгледа неактивен.
- Automated E2E coverage ги покрива public shell, legal routes, demo-player mount и безбеден authenticated QA harness за Settings/H3.

## Definition of Done за batch

Batch-от е затворен само кога:

- [ ] Scope-от е мал и експлицитен.
- [ ] Сите релевантни interaction semantics се зачувани.
- [ ] Постоечките тестови се ажурирани и новите ризици се покриени.
- [ ] Typecheck поминува.
- [ ] Целиот unit/integration suite поминува.
- [ ] Browser QA поминува на бараните viewport/theme комбинации.
- [ ] Нема нови console errors и критични accessibility регресии.
- [ ] Diff-от е рачно прегледан.
- [ ] Ledger-от е ажуриран со commit, test и QA докази.
- [ ] Направен е наменски commit; не е push-нат без потврда.

## Извршен редослед

### H0 — Baseline и verification harness

- [x] Утврди зошто целиот Vitest run изгледа како да заглавува.
- [x] Потврди свеж typecheck и full-suite baseline.
- [x] Потврди локална Playwright/MCP достапност.
- [x] Дефинирај browser QA matrix за public и authenticated surfaces.

### H1 — Button Tier 1: низок ризик

- [x] `InstallPrompt` — 2 controls.
- [x] `ErrorBoundary` — 1 app-primary action.
- [x] `ImageUploader` + `TrackUploader` — 4 controls.
- [x] `ExplorePage` — 1 control.
- [x] `PlanGate` — 1 control.
- [x] Dedicated tests за interaction, click isolation, reset, disabled и loading патеки.
- [x] Desktop 1440×900 и mobile 375×812 light/dark visual verification; zero browser console errors.

### H2 — Button Tier 2: среден ризик

- [x] `PricingPage` + `PaymentModal`.
- [x] `SettingsPage`.
- [x] `JoinSession`.
- [x] Form submission, loading, pending state и theme verification за H2a/H2c; Settings е потврден преку authenticated desktop/mobile Playwright harness.

### H3 — Button Tier 3: висок ризик, мали подфази

- [x] H3a Layout/auth/consent/onboarding.
  - [x] H3a-1 Analytics consent + onboarding controls.
  - [x] H3a-2 LoginModal auth controls.
  - [x] H3a-3 DashboardLayout + Sidebar controls.
- [x] H3b Dashboard и review surfaces.
  - [x] H3b-1 PlanUsageWidget + SubmissionReviewModal.
  - [x] H3b-2 TemplatesLibrary.
  - [x] H3b-3 ClassGroups.
  - [x] H3b-4 BoundsDashboard.
  - [x] H3b-5 ResultsDashboard.
- [x] H3c Creator shell и modals.
  - [x] H3c-1 BoundCreator header/shell.
  - [x] H3c-2 ShareModal.
  - [x] H3c-3 StageList.
  - [x] H3c-4 QuestSettingsPanel.
  - [x] H3c-5 FindSpotPlannerPanel.
- [ ] H3d Creator stage editors.
- [ ] H3e Session/Admin.
- [ ] H3f MobilePlayer shell и stage players, последни.

За секое raw копче прво се одредува дали е action button, tab, toggle, interactive card, icon control или link-like navigation. Не се применува механичка замена.

### H4 — Card semantic audit и миграција

- [ ] Инвентар и класификација: semantic card / interactive surface / shell / overlay / modal / media frame.
- [ ] Едноставни informational cards.
- [ ] Dashboard cards.
- [ ] Creator dark cards со `tone="dark"`.
- [ ] Player/session surfaces, последни.
- [ ] Проширување на Card API само за повторлив semantic pattern.

### H5 — Мали product-completeness задачи

- [ ] Changelog route, page и navigation entry.
- [ ] Преостанатите LandingPage user-facing literals во `mk.json`/`en.json`.
- [ ] Translation parity test.

### H6 — Стабилен student identity и attempts

- [ ] Optional stable `QuestResult.studentId` за roster players; guest/public compatibility.
- [ ] `attemptId`/attempt number и immutable result semantics.
- [ ] First/latest/best/teacher-approved result policy.
- [ ] Resubmission lifecycle и teacher controls.
- [ ] Firestore rules, indexes и backward compatibility за стари резултати.
- [ ] Tests за duplicate names, renamed students, guests и повеќе attempts.

### H7 — Objectives, coverage и mastery

- [ ] Стабилен objective ID/reference model.
- [ ] Optional `objectiveRef` на `BaseStage` со validation и backward compatibility.
- [ ] Creator UI за mapping на етапи кон цели.
- [ ] Curriculum-coverage aggregation и teacher UI.
- [ ] Objective-level mastery врз stable student/attempt model.
- [ ] Student/parent report и CSV/PDF export.
- [ ] Privacy и authorization review за извештаите.

### H8 — Institutional SaaS completeness

- [ ] Billing lifecycle: trial, recurring renewal, cancellation, failure/retry и audit trail.
- [ ] Onboarding email sequence со consent/unsubscribe контроли.
- [ ] Institutional renewal/admin documentation.
- [ ] Security, privacy, accessibility, performance и operational-readiness audit.
- [ ] Production monitoring, alerting, backup/restore и incident runbooks.

## Регистар на познати ризици

| ID | Ризик | Контрола | Статус |
|---|---|---|---|
| R1 | Coral `primary` може да замени indigo app action | Експлицитно variant mapping по call site | Open |
| R2 | `Button` менува font weight, padding, radius и focus style | Visual diff и semantics review | Open |
| R3 | `size="icon"` е `rounded-lg`, не `rounded-full` | Зачувај geometry со намерен override/API | Open |
| R4 | Player/night-mode палети може да се регресираат | Player е последен + browser QA | Open |
| R5 | Rounded container може погрешно да се претвори во Card | Semantic Card audit пред миграција | Open |
| R6 | Full Vitest run изгледа заглавен без streaming output | Детерминистички `--maxWorkers=1`; ~2 min на Windows/jsdom | Controlled |
| R7 | Playwright smoke не покрива authenticated app surfaces | Manual MCP QA + постепени stable E2E specs | Open |
| R8 | Name-based gradebook identity е нестабилна | Stable student ID пред mastery/reporting | Open |
| R9 | Recharts испишува negative-size warnings во weak-spots render tests | Детерминистички `ResponsiveContainer` test double | Closed |
| R10 | LoginModal Google sign-in test испишува React `act(...)` warning | Await/wrap asynchronous state update | Closed |
| R11 | AutoSave failure-path tests испишуваат очекуван `console.error` noise | Spy, suppress и assert на expected logging contract | Closed |
| R12 | Fixed `InstallPrompt` може да прекрие pricing content/CTA, особено на mobile | Route-aware suppression на `/pricing`; deferred event се чува за следна eligible SPA route | Closed |
| R13 | Local dummy Firebase не овозможува authenticated browser QA за Settings/H3 | Одделен QA-only Vite config со mock AuthContext/storage; нема production auth bypass | Closed |
| R14 | Join inputs немаа explicit labels/error ARIA, Back target е под 44px | Stable labels, field-specific invalid/describedby, `role=alert`, `min-h-11` | Closed |
| R15 | `npm audit` пријави 35 dependency наоди (1 critical, 2 high, 31 moderate, 1 low), вклучувајќи Vite и транзитивен `websocket-driver` | Non-force updates ги отстранија сите critical/high/low; остануваат 19 moderate во Expo/Firebase Admin graph без non-breaking fix. Следи upstream/major-upgrade review; без downgrade или `audit fix --force` | Controlled |
| R16 | Production build предупредува дека dynamic imports на `offlineQueue.ts`/`storage.ts` не создаваат посебни chunks поради static imports | Sync orchestration е издвоен во `offlineSync.ts`; circular storage import и лажниот MobilePlayer lazy import се отстранети, со зачуван in-flight deduplication | Closed |

## Извршена евиденција

| Датум | Batch | Commit | Typecheck | Tests | Browser QA | Забелешки |
|---|---|---|---|---|---|---|
| 2026-07-17 | Ledger bootstrap + H0 test baseline | `5db9736` | PASS | 472/472 PASS | PASS | Playwright/MCP harness потврден; R9/R10 warning debt е евидентиран. |
| 2026-07-17 | H1 Button Tier 1 | `5db9736` | PASS | 479/479 PASS | PASS | 6 production files, 9 controls; evaluator round 2 PASS; desktop/mobile light/dark; zero console errors. |
| 2026-07-17 | Test warning cleanup R9–R11 | `04f1581` | PASS | 479/479 PASS, clean stderr | n/a | Recharts sizing, React async act и expected AutoSave logging се покриени без шум. |
| 2026-07-17 | H2a PricingPage + PaymentModal | `ac9e218` | PASS | 483/483 PASS, clean stderr | PASS | 4 plan CTAs + 7 payment controls; evaluator PASS; desktop/mobile light/dark; R12 overlap follow-up е одделно евидентиран. |
| 2026-07-17 | R12 InstallPrompt pricing collision | `db242e3` | PASS | 485/485 PASS, clean stderr | PASS | Pricing suppression + deferred prompt reappearance after SPA navigation; evaluator round 2 PASS. |
| 2026-07-17 | H2b SettingsPage | `7242c6c` | PASS | 492/492 PASS, clean stderr | Not run (R13) | All Settings controls; 7 focused state/contract tests; evaluator round 2 PASS. |
| 2026-07-17 | H2c JoinSession + R14 accessibility | `e3bbcb0` | PASS | 499/499 PASS, clean stderr | PASS | Desktop/mobile, light/dark, validation, zero console errors; evaluator round 2 PASS. |
| 2026-07-17 | R13 authenticated browser QA harness | `9a354ac` | PASS | 499/499 PASS, clean stderr | PASS | Settings на Desktop Chrome + Pixel 7: tabs, Free gating, push state, mobile drawer, overflow и zero console errors; QA config е целосно одделен од production build. |
| 2026-07-17 | R15 non-breaking dependency security updates | `b436c18` | PASS web + mobile | 499/499 PASS; production build PASS; Expo dependencies compatible | PASS | Audit 35 → 19 moderate; critical/high/low = 0. Vite 6.4.3, websocket-driver 0.7.5 и други safe updates; преостанатото бара upstream/major review. |
| 2026-07-17 | R16 offline sync bundle boundary | `7e81390` | PASS | 499/499 PASS; focused offline/player 14/14; warning-free production build | PASS | Circular `storage`/`offlineQueue` dependency е отстранет; retry queue, partial failure и concurrent-sync deduplication се зачувани. |
| 2026-07-17 | H3a-1 consent + onboarding controls | `66ec5f0` | PASS | 503/503 PASS; 4 focused contracts | PASS | Desktop/mobile onboarding CTA и navigation; consent accept/sync/dismiss contracts; QA Firebase isolation проширен во `ed8ec9c`. |
| 2026-07-17 | H3a-2 LoginModal auth controls | `9e55d6d` | PASS | 504/504 PASS; 7 focused contracts | PASS | Public guest flow, tab ARIA, exact submit semantics, Google/email actions, close/Escape; browser matrix 6 PASS со 2 намерни viewport skips. |
| 2026-07-17 | H3a-3 DashboardLayout + Sidebar controls | `dfceebe` | PASS | 507/507 PASS; 6 focused Sidebar contracts | PASS | Active-page/language ARIA, theme, upgrade, admin, explore, logout и mobile drawer; browser matrix 7 PASS со 3 намерни viewport skips; H3a complete. |
| 2026-07-17 | H3b-1 plan usage + submission review controls | `b9e004c` | PASS | 510/510 PASS; 3 focused contracts | PASS | Upgrade routing, enterprise suppression и целосен rubric grading lifecycle; browser matrix 9 PASS со 3 намерни viewport skips; production build PASS. |
| 2026-07-17 | H3b-2 TemplatesLibrary controls | `122d0a8` | PASS | 513/513 PASS; 3 focused contracts | PASS | Free/Pro gating, template payload, favorite persistence, filtering и accessible toggle state; desktop/mobile submission panel и zero overflow; browser matrix 11 PASS со 3 намерни skips; production build PASS. |
| 2026-07-17 | H3b-3 ClassGroups controls + safe delete | `370cefc` | PASS | 516/516 PASS; 3 focused contracts | PASS | Сите 8 control patterns мигрирани; group/assignment pressed semantics, create/student persistence и native confirm заменет со Modal. Desktop/mobile create-cancel-delete lifecycle и zero overflow; browser matrix 13 PASS со 3 намерни skips; production build PASS. |
| 2026-07-17 | H3b-4 BoundsDashboard quest controls | `2601175` | PASS | 519/519 PASS; 6 focused contracts | PASS | Сите 11 raw controls мигрирани; favorite/offline pressed persistence, AI/live/quest-limit gates, exact play/edit routes и noopener player tab. Desktop/mobile quest toggles + cancel/confirm delete и zero overflow; browser matrix 15 PASS со 3 намерни skips; production build PASS. |
| 2026-07-17 | H3b-5 ResultsDashboard controls + exports | `d1878f4` | PASS | 522/522 PASS; 6 focused contracts | PASS | Сите 6 control patterns мигрирани; semantic tablist, Pro fetch gate, weak-spot navigation, rubric review, disabled empty exports и CSV object-URL cleanup. Desktop/mobile tab/export state и zero overflow; browser matrix 17 PASS со 3 намерни skips; production build PASS; H3b complete. |
| 2026-07-17 | H3c-1 BoundCreator shell controls | `a3eca51` | PASS | 526/526 PASS; 9 focused BoundCreator contracts | PASS | Сите 6 shell controls мигрирани; dashboard route, settings pressed state, Share modal, manual save и auto-save retry wiring. Desktop/mobile creator shell, save lifecycle и zero overflow; browser matrix 19 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3c-2 ShareModal copy controls + feedback | `920a1e8` | PASS | 529/529 PASS; 7 focused ShareModal contracts | PASS | Двата copy controls мигрирани во заеднички Button-backed flow; успех само по потврден Clipboard запис, visible/accessibility feedback при одбивање и timer cleanup. Desktop/mobile copy success, semantic link value и zero modal overflow; browser matrix 19 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3c-3 StageList controls + accessible lifecycle | `e6c3974` | PASS | 533/533 PASS; 9 focused StageList contracts | PASS | Сите raw controls мигрирани; semantic pressed stage selection, keyboard-visible insert/card actions, precise labels, safe delete modal и валидирани reorder indices. Desktop/mobile add, duplicate, Enter selection, confirm delete и zero overflow; browser matrix 19 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3c-4 QuestSettings controls + destructive lifecycle | `55e7bb5` | PASS | 542/542 PASS; 22 focused settings/creator/autosave contracts | PASS | Tags, inventory, goals и danger controls мигрирани; мртвото delete копче доби confirmation/loading/error flow. Unicode sanitizer ја задржува „ј“; autosave suspend + snapshot guard спречуваат resurrect-after-delete и губење понова dirty измена. Desktop/mobile CRUD, delete-cancel, manual save и zero overflow; browser matrix 19 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3c-5 FindSpotPlanner controls + H3c audit | `71e6c03` | PASS | 546/546 PASS; 8 focused planner contracts | PASS | Add-mode и marker selection контролите мигрирани со semantic pressed state, точни accessible имиња и memoized map payload. Direct tests ги покриваат empty/add/select/move lifecycle-ите; desktop/mobile FIND_SPOT creator flow и zero overflow; browser matrix 19 PASS со 3 намерни skips; production build PASS. Completion audit: нема raw button во H3c shell опсегот; преостанатите creator raw controls се ограничени на планираниот H3d `creator/stages/*` опсег. H3c complete. |

## Следна акција

Продолжи со H3d Creator stage editors во мали semantic batches: прво inventory/classification и shared editor controls, потоа едноставните editors, а Quiz/Rubric/QR complex lifecycle-ите одделно. За секој batch важат focused tests, full suite/build и desktop/mobile creator QA. R15 останува контролиран и се ревидира при Expo/Firebase Admin major-upgrade планирањето.
