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
- Production Button миграцијата е целосно завршена низ H1, H2 и H3a-H3g. Completion audit и remediation затворија 24 raw non-primitive controls и еден native alert; финалниот audit потврди нула raw application controls и нула native alerts/confirms. Единствените три raw `<button>` појавувања се намерните `Button`, `Modal` и `Toggle` primitives. Card миграцијата не е започната.
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
- [x] H3d Creator stage editors.
  - [x] H3d-1 Shared editor Tabs semantic primitive.
  - [x] H3d-2 Simple editors: FindSpot, Survey и Switch.
  - [x] H3d-3 ScanCode и QrTask lifecycle-и.
  - [x] H3d-4 Quiz и Rubric complex lifecycle-и.
    - [x] H3d-4a Rubric CRUD, presets и score bounds.
    - [x] H3d-4b Quiz answer-type controls и reorder semantics.
- [x] H3e Session/Admin.
  - [x] H3e-1 LiveSessionHost/session controls.
  - [x] H3e-2 AdminPanel по функционални секции.
    - [x] H3e-2a Shell, semantic tabs/filters и payment moderation lifecycle.
    - [x] H3e-2b Template seed/cleanup/moderation lifecycle и H3e audit.
- [x] H3f MobilePlayer shell и stage players.
  - [x] H3f-1 Entry/onboarding и finish/grade/feedback/certificate controls.
  - [x] H3f-2 Stage selection и active gameplay shell/modals.
  - [x] H3f-3 Player stage components по сродни мали групи.
    - [x] H3f-3a Info, Survey и Tournament single-action players.
    - [x] H3f-3b Mission и Switch input/action players.
    - [x] H3f-3c FindSpot и QR device-assisted players.
    - [x] H3f-3d Quiz multi-format player и H3/Button completion audit.
- [x] H3g Completion-audit remediation пред Card миграција.
  - [x] H3g-1 GenerateQuestModal и ClassGroups native alert.
  - [x] H3g-2 MathRichEditor toolbar/popover controls.
  - [x] H3g-3 LandingPage navigation/CTA/language controls.
  - [x] H3g-4 Нулти production raw-control audit и целосна browser matrix.

За секое raw копче прво се одредува дали е action button, tab, toggle, interactive card, icon control или link-like navigation. Не се применува механичка замена.

### H4 — Card semantic audit и миграција

- [x] Инвентар и класификација: semantic card / interactive surface / shell / overlay / modal / media frame (`docs/H4_CARD_SEMANTIC_INVENTORY.md`).
- [x] Едноставни informational cards.
  - [x] H4a Landing `Testimonial`, `Step` и `Audience`.
  - [x] H4b Pricing plan cards; `SettingsPage` sections се потврдени како form/settings shells и намерно не се мигрирани.
- [x] Dashboard cards.
  - [x] H4c-1 `ResultsDashboard` funnel summary cards.
  - [x] H4c-2 `ResultsDashboard` stage-drop и question-accuracy analysis cards.
  - [x] H4c-3 `PlanUsageWidget` stateful informational card.
  - [x] H4c-4 Dashboard completion audit: interactive tiles, filters/forms, chart/table shells, banners/modals и grading rows се намерно исклучени.
- [x] Creator/admin dark cards со `tone="dark"`.
  - [x] H4d-1 Admin template-moderation и payment-request record cards.
  - [x] H4d-2 Creator/admin completion audit: преостанатите surfaces се action/log/alert, media fallback, empty/help, draggable/editable, paywall/danger, preview или editor/form shells и намерно не се Card кандидати.
- [x] Player/session surfaces, последни.
  - [x] H4e-1 Player read-only informational cards: INFO description, TOURNAMENT team task и shared rubric preview.
  - [x] H4e-2 Player finish-summary cards: points, achievements и collected inventory.
  - [x] H4e-3 Player/session completion audit: сите преостанати wrappers имаат shell, interaction, lifecycle, overlay, alert или media/device semantics.
- [x] Card API completion audit: не е потребно проширување; нема нов повторлив semantic pattern.

### H5 — Мали product-completeness задачи

- [x] Changelog route, page и navigation entry.
- [x] Преостанатите LandingPage user-facing literals во `mk.json`/`en.json`.
- [x] Translation parity test.

### H6 — Стабилен student identity и attempts

- [x] Optional stable `QuestResult.studentId` за roster players; guest/public compatibility.
  - [x] H6-1 Data contract: optional bounded field, Firestore create validation и ID-first/name-fallback gradebook matching.
  - [x] H6-2 Roster-bound player launch/result producer со вистински `GroupStudent.id` (никогаш session/device UUID).
- [x] `attemptId`/attempt number и immutable result semantics.
- [x] First/latest/best/teacher-approved result policy.
- [x] Resubmission lifecycle и teacher controls.
- [x] Firestore rules, indexes и backward compatibility за стари резултати.
- [x] Tests за duplicate names, renamed students, guests и повеќе attempts.

### H7 — Objectives, coverage и mastery

- [x] Стабилен objective ID/reference model.
- [x] Optional `objectiveRef` на `BaseStage` со validation и backward compatibility.
- [x] Creator UI за mapping на етапи кон цели.
- [x] Curriculum-coverage aggregation и teacher UI.
- [x] Objective-level mastery врз stable student/attempt model.
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
| 2026-07-18 | H3d-1 Shared creator editor Tabs | `55c4cbc` | PASS | 548/548 PASS; 28 focused dependent contracts | PASS | Shared Tabs мигриран во Button-backed `tablist`/`tab` primitive со `aria-selected`; сите Quiz/QuestSettings/BoundCreator consumers и тестови усогласени. QA manual-save насловот е направен детерминистички за reuse-нат server. Desktop/mobile tab selection и creator lifecycle; browser matrix 19 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3d-2 FindSpot, Survey и Switch editors | `60df4a9` | PASS | 554/554 PASS; 8 focused simple-editor contracts | PASS | Сите 6 raw controls мигрирани; map toggle има semantic pressed state, GPS success rounding/map-open contract, а Survey/Switch icon-delete controls имаат точни индексни labels. Add/remove и 20-question limit lifecycle-и се директно покриени. Desktop/mobile FIND_SPOT coordinates/map lifecycle и zero overflow; browser matrix 19 PASS со 3 намерни skips; production build PASS. Manual-save browser assertion е задржан на независниот desktop run за да нема cross-project autosave race. |
| 2026-07-18 | H3d-3 ScanCode + QrTask QR lifecycles | `a7d945d` | PASS | 559/559 PASS; 13 focused QR editor/player contracts | PASS | Сите 8 raw controls мигрирани. Shared clipboard lifecycle чека реален write, прикажува success/error и го чисти timer-от при unmount; SVG download секогаш го revoke-ира object URL преку `finally`. Option controls имаат precise A-F labels и limit contract; нула raw buttons во двата editors. Desktop/mobile QR_TASK create→generate→copy→tab→delete lifecycle и zero overflow; browser matrix 19 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3d-4a Rubric CRUD + presets | `6045c90` | PASS | 564/564 PASS; 14 focused rubric/editor/review contracts | PASS | Сите 6 raw controls мигрирани со precise criterion/level/preset labels. Level score persistence е clamp-ирана на 0–1000; empty/duplicate/max preset action е semantic disabled. Criterion/level/preset add-remove, sole-level guard и max-score contracts се директно покриени; нула raw buttons во RubricEditor. Desktop/mobile Survey rubric criterion/preset CRUD и zero overflow; browser matrix 19 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3d-4b Quiz controls + validation + H3d audit | `4c87ab2` | PASS | 569/569 PASS; 89 focused Quiz editor/validation/player contracts | PASS | Сите 8 Quiz raw controls мигрирани; precise remove/reorder labels и 8-option/20-pair/20-item limits се усогласени меѓу UI и schema. Критичен production gap затворен: QuizStageSchema сега прифаќа и валидира matching/ordering payload-и наместо да ги одбива. Desktop/mobile Quiz matching add/remove lifecycle и zero overflow; browser matrix 19 PASS со 3 намерни skips; production build PASS. Completion audit: нула raw `<button>` во целиот `creator/stages/*`; H3d complete. |
| 2026-07-18 | H3e-1 LiveSessionHost controls + safe async lifecycle | `3e9bdb6` | PASS | 574/574 PASS; 5 focused host contracts | PASS | Сите 14 raw controls мигрирани; mode/time toggles имаат pressed semantics, broadcast icon controls precise labels, а clipboard timer се чисти. Start/finish/stage/SOS/time actions имаат loading/error discipline. Небезбедното delete-and-navigate е заменето со confirmation modal што навигира само по успешен delete и прикажува видлив dialog alert при failure. QA-only session fixture овозможува desktop/mobile create→copy→delete-cancel lifecycle и zero overflow; browser matrix 21 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3e-2a Admin shell + payment moderation | `538f7f3` | PASS | 579/579 PASS; 5 focused admin contracts | PASS | Shell navigation и refresh се Button-backed; main sections се semantic tabs, а payment filters имаат pressed state. Approve/reject повеќе не извршуваат финансиска промена со единечен клик: confirmation modal ја прикажува трансакцијата, чека backend success и останува отворен со видлив alert при failure. Load/refresh errors се видливи. QA-only payment fixture овозможува desktop/mobile tabs→filter→approve-cancel lifecycle и zero overflow; browser matrix 23 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3e-2b Admin template moderation + H3e audit | `0d96d5f` | PASS | 585/585 PASS; 11 focused admin/storage contracts | PASS | Сите 5 template controls мигрирани; native seed/cleanup confirms се заменети со Modal, moderation labels го именуваат точниот шаблон, а сите actions имаат loading/error lifecycle. Seed/cleanup ја освежуваат листата. Затворен production logic gap: Featured контролата претходно била недостижна бидејќи pending-only fetch никогаш не враќал approved шаблон; новиот admin contract вчитува одделно ограничени queues од 100 pending + 100 approved за едната да не ја истисне другата. Desktop/mobile seed-cancel, approve-cancel, reachable Featured toggle и zero overflow; browser matrix 25 PASS со 3 намерни skips; production build PASS. Completion audit: нула raw `<button>` во `AdminPanel` и `LiveSessionHost`; H3e complete. |
| 2026-07-18 | H3f-1 MobilePlayer entry + finish controls | `113cbe7` | PASS | 589/589 PASS; 7 focused orchestration contracts | PASS | Осум entry/onboarding/finish raw controls се мигрирани; theme toggle има pressed semantics и прецизно светла/темна име, onboarding dismissal се перзистира, а start останува semantic disabled додека името е празно. Grade failure доби вистински retry; feedback и certificate async failures сега имаат loading, видлив alert и успешен retry наместо unhandled promise/console-only feedback. QA-only едноетапен player quest овозможува desktop/mobile entry→theme→onboarding→finish→feedback lifecycle и zero overflow; browser matrix 27 PASS со 3 намерни skips; production build PASS. Преостанатите 14 raw MobilePlayer controls се изолирани во H3f-2 active shell опсегот. |
| 2026-07-18 | H3f-2 MobilePlayer stage selection + active gameplay shell/modals | `d7c26fb` | PASS | 592/592 PASS; 10 focused orchestration contracts | PASS | Сите преостанати 14 raw `MobilePlayer` controls се мигрирани и component audit потврди нула `<button>`/`window.confirm`. Selectable stages имаат прецизни state labels; theme/offline/SOS/HUD controls имаат pressed/loading/error discipline; offline cache failure го враќа state-от и прикажува alert. Tournament/map overlays се semantic dialogs, а напуштањето користи shared confirmation Modal. Desktop/mobile HUD→tournament→map→exit-cancel lifecycle и zero overflow; browser matrix 29 PASS со 3 намерни skips; production build PASS. |
| 2026-07-18 | H3f-3a Info, Survey + Tournament stage actions | `055941a` | PASS | 592/592 PASS; 11 focused stage contracts | PASS | Трите едно-action stage players се мигрирани во shared Button без промена на нивната визуелна хиерархија: emerald success, indigo app-primary и explicit orange tournament action. Survey disabled contract и сите callback contracts остануваат покриени. Desktop/mobile player entry/finish/HUD regression 4/4 PASS со zero overflow; production build PASS. Во stage inventory остануваат 18 raw controls во Mission, Switch, FindSpot, QR и Quiz. |
| 2026-07-18 | H3f-3b Mission + Switch input/action players | `9ae6e37` | PASS | 594/594 PASS; 14 focused stage contracts | PASS | Сите 5 Mission/Switch raw controls се мигрирани. Audio start/stop е вистински toggle со `aria-pressed`, retake/finish ја задржуваат точната визуелна хиерархија, а upload errors се live alerts. Switch патеките добија прецизни recommended/locked accessible names без лажно selected state; missing-item disabled contract е зачуван. Desktop/mobile player regression 4/4 PASS со zero overflow; production build PASS. Во stage inventory остануваат 13 raw controls само во FindSpot, QR и Quiz. |
| 2026-07-18 | H3f-3c FindSpot + QR device-assisted players | `5a713e0` | PASS | 596/596 PASS; 15 focused stage contracts | PASS | Сите 8 FindSpot/QR control категории се мигрирани. GPS denied/unavailable и scanner failures се live alerts; arrived/retry/continue/optional-skip actions ја задржуваат точната визуелна хиерархија. QR multiple-choice има pressed state и се заклучува по feedback; error/success feedback има alert/status semantics. Scanner lifecycle останува правилно во parent orchestration и не е дуплиран во presentation component. Desktop/mobile player regression 4/4 PASS со zero overflow; production build PASS. Stage inventory: само 5 raw controls во Quiz. |
| 2026-07-18 | H3f-3d Quiz multi-format player + completion audit | `c0d6597` | PASS | 597/597 PASS; 19 focused Quiz contracts | PASS | Последните 5 player control категории се мигрирани: multiple-choice pressed/locked state, item-aware ordering controls, submit/timeout actions и accessible timer/progressbar/feedback. Player/stages audit е нула raw controls. Desktop/mobile player regression 4/4 PASS со zero overflow; production build PASS. Глобалниот production component audit спречи лажно H3 затворање: остануваат 24 raw non-primitive controls во GenerateQuestModal, MathRichEditor и LandingPage, плус еден native alert во ClassGroups; 3 дополнителни raw линии се легитимните Button/Modal/Toggle primitives. |
| 2026-07-18 | H3g-1 AI modal + ClassGroups alert remediation | `8f672a3` | PASS | 598/598 PASS; 9 focused AI/group contracts | PASS | Двата GenerateQuestModal controls се мигрирани со shared loading/disabled semantics и live error alert. ClassGroups native blocking alert е заменет со тестиран in-app certificate notice; empty cohort не повикува PDF download. Desktop/mobile ClassGroups regression 2/2 PASS; production build PASS. Audit: нула native alerts/confirms и 22 raw non-primitive controls — 7 MathRichEditor + 15 LandingPage. |
| 2026-07-18 | H3g-2 MathRichEditor toolbar/popover controls | `34dfce9` | PASS | 601/601 PASS; 3 dedicated editor contracts | PASS | Сите 7 toolbar/popover control категории се мигрирани. Bold/italic/math actions имаат precise labels; symbols и preview имаат expanded/controls semantics; dynamic symbols се именувани по визуелен знак и LaTeX insert. Новите тестови го заклучуваат selection wrapping, textarea focus/cursor restoration, symbol insertion и preview visibility. Desktop/mobile creator lifecycle 2/2 PASS со zero overflow; production build PASS. Audit: само 15 raw non-primitive controls во LandingPage. |
| 2026-07-18 | H3g-3/H3g-4 LandingPage + Button completion audit | `4275cad` | PASS | 601/601 PASS; Landing semantics 2/2 PASS | PASS | Сите 15 LandingPage navigation/CTA/language/FAQ controls се мигрирани со зачувана coral marketing, dark custom и white secondary хиерархија. Language state користи `aria-pressed`; FAQ користи `aria-expanded`/`aria-controls`. Финалниот production audit потврди нула raw application controls и нула native alerts/confirms; остануваат само трите намерни Button/Modal/Toggle primitives. Целосната desktop/mobile browser matrix: 31 PASS и 3 намерни viewport skips; zero overflow; production build PASS. |
| 2026-07-18 | H4a Landing informational cards | `e20ec12` | PASS | 601/601 PASS; Landing Card browser contract 2/2 PASS | PASS | `Testimonial`, `Step` и `Audience` се мигрирани во shared Card во единствениот одобрен production фајл; вкупно 9 render-и. Exact light background, border opacity, small shadow, padding и Audience hover contract се зачувани со експлицитни overrides; FAQ, adventure tiles, banners и media frames не се допрени. Desktop/mobile Landing semantics и zero overflow PASS; production build PASS. |
| 2026-07-23 | H4b Pricing plan cards | `62ab729` | PASS | 601/601 PASS; 8 focused Pricing contracts | PASS | Четирите commerce plan wrappers се мигрирани во shared `Card` со `padded={false}` и експлицитно зачувани slate/indigo/emerald/amber borders, light/dark backgrounds, highlighted ring/shadow и current-plan state. `SettingsPage` sections се semantic form/settings shells и намерно не се мигрирани. Desktop/mobile Pricing contract 2/2 PASS во light/dark, со zero overflow и zero console errors; production build PASS. |
| 2026-07-23 | H4c-1 Results funnel summary cards | `dec2788` | PASS | 602/602 PASS; 7 focused Results contracts | PASS | Трите compact funnel statistics panels се мигрирани во shared hard-dark `Card`; exact `rounded-xl`, slate palette, compact padding и no-shadow contract се зачувани. Chart, table, filters, grading rows и interactive surfaces не се допрени. Desktop/mobile Results contract 2/2 PASS со zero overflow; production build PASS. |
| 2026-07-23 | H4c-2 Results analysis cards | `e3e8a4c` | PASS | 603/603 PASS; 8 focused Results contracts | PASS | Per-stage funnel rows и per-question accuracy panels се мигрирани во shared hard-dark `Card`; compact `rounded-xl`, no-shadow contract и rose big-drop warning state се зачувани. Chart/table shells, weak-spot navigation buttons, grading rows, paywall/empty states и icon frames се semantic review-ирани и намерно исклучени. Desktop/mobile Results contract 2/2 PASS со zero overflow; production build PASS. |
| 2026-07-23 | H4c-3 Plan usage card + dashboard audit | `55d25d1` | PASS | 604/604 PASS; 4 focused plan/review contracts | PASS | `PlanUsageWidget` е мигриран во shared hard-dark `Card` со зачувани normal/warning/exhausted palette состојби, responsive layout, plan badge и upgrade action; usage bar доби explicit progressbar semantics, а unlimited plan намерно нема progressbar. Dashboard completion audit ги исклучува interactive quest/template tiles, filters/forms, chart/table shells, banners/modals, grading lifecycle rows и decorative frames. Desktop/mobile upgrade/card contract 2/2 PASS; production build PASS. |
| 2026-07-23 | H4d-1 Admin moderation record cards | `f84e802` | PASS | 604/604 PASS; 10 focused Admin contracts | PASS | Template-moderation и payment-request records се мигрирани во shared hard-dark `Card` со зачувани `slate-900`, `slate-800` border, compact `rounded-xl`, padding и no-shadow contract. Wrapper-ите остануваат non-interactive, а confirmation, moderation, Featured и financial actions остануваат експлицитни Button/Modal lifecycle-и. Desktop/mobile Admin contracts 4/4 PASS со zero overflow; production build PASS. |
| 2026-07-23 | H4d-2 Creator/admin completion audit | `b2ff6de` | PASS | 604/604 PASS (carried verified baseline; documentation-only audit) | PASS (no visual changes) | Exhaustive semantic audit потврди дека нема преостанат valid non-interactive content-card candidate. Admin seed/action/log/error states и Creator media fallbacks, empty/help states, draggable/editable rows, paywall/danger notices, previews и editor/form shells остануваат во своите специјализирани contracts; Card API не се проширува. H4d complete. |
| 2026-07-23 | H4e-1 Player informational cards | `95f8608` | PASS | 606/606 PASS; 21 focused player contracts | PASS | INFO description, TOURNAMENT team task и shared rubric preview се мигрирани во `Card` како read-only informational surfaces. Exact light/night palette, padding, borders и shadow contracts се зачувани со експлицитни overrides; media, scanner, answer-selector и live-control surfaces не се допрени. Desktop/mobile INFO lifecycle 2/2 PASS со zero overflow; production build PASS. |
| 2026-07-23 | H4e-2 Player finish-summary cards | `8a5c835` | PASS | 606/606 PASS; 10 focused MobilePlayer contracts | PASS | Finish-screen points, achievements и collected-inventory summaries се мигрирани во shared `Card`, со зачувани light/night palette, compact padding, small shadow и points `rounded-3xl` contract. Teacher-grade, feedback и certificate lifecycle panels не се допрени. Desktop/mobile finish lifecycle 2/2 PASS со zero overflow; production build PASS. |
| 2026-07-23 | H4e-3 Player/session completion audit + H4 closure | `ac733c7` | PASS | 606/606 PASS (carried verified baseline; documentation-only audit) | PASS (no visual changes) | Exhaustive audit ги класифицира преостанатите MobilePlayer, stage-player, JoinSession и LiveSessionHost wrappers како application/game shells, interactive navigation/forms, async lifecycle panels, overlays/dialogs, alerts/status UI или media/device frames. Нема преостанат valid content-card candidate и Card API не бара проширување. H4 complete. |
| 2026-07-23 | H5-1 Public changelog | `99b39ac` | PASS | 608/608 PASS; 6 focused changelog/sitemap contracts | PASS | Додадена е lazy-loaded public `/changelog` страница со SEO metadata, три dated release sections, shared Footer navigation entry и sitemap source-of-truth/static XML entry. Desktop/mobile production-preview contract 2/2 PASS со реалниот локален VITE config, zero overflow и zero console/page/request errors; production build PASS. |
| 2026-07-23 | H5-2 LandingPage localization | `72977b9` | PASS | 611/611 PASS; 3 focused Landing translation contracts | PASS | Featured adventures блокот и language-group label се целосно префрлени во `mk.json`/`en.json`; testimonial initials сега се изведуваат од локализираните записи. Македонскиот copy, navigation и visual hierarchy се зачувани. Desktop/mobile MK→EN production-preview contract 2/2 PASS со zero overflow и zero runtime/console errors; production build PASS. |
| 2026-07-23 | H5-3 Translation parity + H5 closure | `291c8bc` | PASS | 612/612 PASS; 1 focused parity contract | N/A (test-only) | Рекурзивниот locale contract ги споредува missing/extra keys, value kinds, array lengths и element structures, како и interpolation placeholder sets помеѓу `mk.json` и `en.json`. Тековните trees се целосно усогласени; production build PASS. H5 complete. |
| 2026-07-23 | H6-1 Stable student identity data contract | `da94de8` | PASS | 615/615 PASS; 69 focused gradebook/validation contracts | N/A (data/test-only) | `QuestResult.studentId` е optional и bounded во shared type, Zod validation и Firestore create rules. Gradebook matching е ID-first и дозволува name fallback само за legacy резултати без `studentId`, со што duplicate-name резултат со туѓ стабилен ID не се припишува погрешно. Guest/public writers остануваат непроменети; production build PASS. |
| 2026-07-23 | H6-2 Roster-bound player launch | `3e3f7a4` | PASS | 624/624 PASS; 44 focused roster/player/offline/gradebook contracts | PASS | Class Groups извезува CSV со индивидуален URL по ученик и доделена авантура. Route contract валидира bounded opaque `GroupStudent.id` и Unicode name; player го претполнува и заклучува името, result producer и offline replay го зачувуваат `studentId`, а grade/certificate lookup е ID-first. Guest/public и live-session UUID flows остануваат без `studentId`. Desktop/mobile production-preview route 2/2 PASS со zero overflow/runtime errors; production build PASS. |
| 2026-07-23 | H6-3 Idempotent attempts | `38f65f5` | PASS (web + mobile) | 628/628 PASS; 100 focused result/offline/validation/gradebook contracts | N/A (data/test-only) | Новите web и mobile submissions добиваат client-generated `attemptId` што истовремено е Firestore document ID. Offline queues ги зачувуваат/backfill-ираат ID-вредностите пред retry, а rules дозволуваат само exact no-op replay покрај постојното owner grading. Attempt numbers се изведуваат deterministically по `completedAt` + stable ID, без race-prone stored counter; legacy records без metadata остануваат читливи. Production build PASS. |
| 2026-07-23 | H6-4 Attempt selection policy | `66ccb48` | PASS (web + mobile) | 632/632 PASS; 75 focused policy/validation contracts | N/A (pure/data-only) | Shared contract поддржува `first`, `latest`, `best` и `teacher-approved`; default за gradebook/сертификати е `best`, со latest deterministic tie-break. Roster matching е stable-ID-first со legacy fallback, duplicate stable IDs не се мешаат, а guest lookup не позајмува roster резултат со исто име. Player creates експлицитно не смеат да внесат approval metadata; production build PASS. |
| 2026-07-23 | H6-5 Teacher attempt approval controls | `4cbc18e` | PASS (rules + web) | 635/635 PASS; 16 focused storage/dashboard contracts | PASS | Firestore owner-only update contract дозволува само paired `approvedAt`/`approvedBy`, го врзува approver-от со `request.auth.uid` и безбедно ги брише двете полиња при revoke; player create и immutable attempt payload остануваат заклучени. ResultsDashboard прикажува deterministically изведен број на обид, approval state, busy/error feedback и approve/revoke controls. Firestore emulator rules compile PASS; desktop/mobile Results lifecycle 2/2 PASS со zero overflow; production build PASS. |
| 2026-07-23 | H6-6 Rules/index/backward-compatibility closure | `5d1c84c` | PASS (audit + web) | 638/638 PASS; 18 focused identity/policy contracts | PASS (carried H6-5 UI gate) | Query audit потврди дека result reads користат само single-field `questId ==` или single-field `completedAt` ordering, па Firestore automatic indexes се доволни и не е потребен composite-index artifact/migration. Legacy results без `studentId`, `attemptId` и approval metadata остануваат читливи и selectable; новата matrix експлицитно ги покрива renamed stable-ID students, duplicate names, guest/roster isolation и teacher-approved избор низ повеќе attempts. Rules compile, H6-5 desktop/mobile gate и production build остануваат зелени. H6 complete. |
| 2026-07-23 | H7-1 Stable objective reference model | `5eb616d` | PASS (web + shared) | 644/644 PASS; 66 focused validation/coverage contracts | N/A (data/pure-only) | Додаден е bounded `LearningObjective { id, label }` модел со unique-ID validation и optional bounded `BaseStage.objectiveRef`; legacy `learningGoals` и stages без mapping остануваат валидни. Pure coverage aggregation мапира исклучиво по стабилен ID, собира stage count/points и одделно пријавува unmapped stages и missing references. Renamed objectives, duplicate labels, unknown/deleted references и legacy quests се експлицитно покриени; production build PASS. |
| 2026-07-23 | H7-2 Creator UI за objective mapping | `0f75ad3` | PASS | 647/647 PASS; 2 focused QuestSettingsPanel + 1 focused BoundCreator contract | PASS | `QuestSettingsPanel` Педагогија-табот добива create/rename/delete за стабилни `LearningObjective` записи; бришење прикажува засегнати етапи и безбедно ги unmapped-ира преку `objectiveRef: undefined` (не по label). `StageEditor` добива семантички `select` за мапирање по стабилен ID, disabled кога нема дефинирани цели. Fix: новиот BoundCreator тест погрешно кликаше на non-interactive title текст наместо на overlay selection button (`Избери етапа N: <наслов>`); поправено пред commit. Desktop 1440×900 create→map→autosave→delete-cancel lifecycle и mobile 375×812 light/dark преку authenticated QA harness (port 3100); zero console errors; production build непроменет (нема нови dependencies). |
| 2026-07-23 | H7-3 Curriculum-coverage summary во Creator | `ac92499` | PASS | 649/649 PASS; 2 focused QuestSettingsPanel contracts | PASS | `QuestSettingsPanel` Педагогија-табот прикажува live покриеност по `computeObjectiveCoverage` (H7-1's pure функција, без нов агрегациски код): мапирани етапи и поени по objective, count на немапирани етапи и на orphaned `objectiveRef` кон избришани цели. Прикажано само кога постои барем една стабилна цел. Desktop 1440×900 и mobile 375×812 преку authenticated QA harness (port 3100), live update по мапирање без reload; zero console errors; production build непроменет. |
| 2026-07-23 | H7-4 Objective mastery модел (pure/data) | pending | PASS (web + shared + mobile) | 654/654 PASS; 5 focused mastery contracts | N/A (pure/data-only) | Додадени се `computeObjectiveMastery` (per-single-attempt reach-ratio по мапирани stages, преку `stageDurations` — cross-stage-type completion сигнал, не per-answer точност) и `buildObjectiveMasteryReport` (per-roster-student, ја користи истата stable-ID-first/legacy-name-fallback резолуција од `buildClassGradebook`/`selectResultForStudent`, вклучувајќи `ResultSelectionPolicy`). И двете се чисто pure, без UI повик; тестирани се null-mastery за немапирани цели, missing-result null-safety и per-student изолација при повеќе обиди. Mobile typecheck исто чист (`packages/shared` е споделен со Expo апп). |

## Следна акција

Commit-ирај H7-4, потоа продолжи со H7-5: teacher-facing UI за objective mastery во ResultsDashboard (или сроден екран), користејќи ја директно `buildObjectiveMasteryReport` — прикажи per-student mastery ratio по objective за класа/roster на избран квест, плус CSV/PDF export. Потоа H7-6: privacy/authorization review за извештаите (кој смее да ги гледа per-student податоците) пред да се смета H7 за целосно затворен. Не воведувај institution-specific curriculum taxonomy без експлицитен source-of-truth.
