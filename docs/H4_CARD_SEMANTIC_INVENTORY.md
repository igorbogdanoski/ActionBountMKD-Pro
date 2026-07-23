# H4 Card Semantic Inventory

**Датум:** 2026-07-18
**Статус:** завршен read-only classification audit; production миграцијата не е започната
**Опфат:** `apps/web/src/components/**/*.tsx`

## Потврдена основа

- `Card` има нула production call sites; постојат само dedicated UI tests.
- 49 non-UI-primitive production component фајла содржат барем една `rounded-xl`, `rounded-2xl` или `rounded-3xl` surface. Ова е candidate inventory, не број на cards.
- Заоблена површина не е автоматски Card. Во inventory-то има inputs, alerts, banners, modals, overlays, shells, media frames и interactive controls.
- `Card` моментално обезбедува theme-aware `auto` tone, hard-dark `dark` tone, optional padding, `rounded-2xl`, border и `shadow-soft`.
- API се проширува само ако најмалку две реални semantic-card употреби бараат ист повторлив contract. Не се додава `unstyled` escape hatch што би го претворил Card во празен wrapper.

## Класификација

### 1. Semantic informational cards — дозволени за рана миграција

- `landing/LandingPage.tsx`: `Testimonial`, `Step`, `Audience`.
- `dashboard/ResultsDashboard.tsx`: compact statistic и analysis panels, по посебен dashboard batch.
- `pricing/PricingPage.tsx`: plan/feature cards, по pricing-specific audit бидејќи имаат commerce hierarchy и selected/recommended states.
- `settings/SettingsPage.tsx`: статични account/plan information sections, откако ќе се одделат од form shells.

### 2. Interactive surfaces — не се мигрираат како обичен Card

- `explore/ExplorePage.tsx`: adventure tile.
- `dashboard/BoundsDashboard.tsx`: quest tile.
- `dashboard/TemplatesLibrary.tsx`: template tile.
- `landing/LandingPage.tsx`: FAQ disclosure и adventure tile.
- `player/MobilePlayer.tsx`: stage-selection tiles.

Овие surfaces имаат click/focus/pressed/selected semantics. Ако подоцна се воведе interactive Card contract, мора да биде експлицитен и тестиран; Card не смее да сокрие nested-interactive проблем.

### 3. Shells и form containers — исклучени

- Dashboard filter/search bars, Settings form sections и Creator editor sections.
- MobilePlayer root/frame, LiveSessionHost layout panels и Admin shell sections.
- Input, select, textarea, code и progress containers.

Овие елементи организираат layout или form state; не претставуваат самостојна content card единица.

### 4. Overlay, modal и transient UI — исклучени

- `AnalyticsConsentBanner`, `InstallPrompt`, `LoginModal`, `PaymentModal`, `ShareModal`, `SubmissionReviewModal`, `GenerateQuestModal`.
- Error, warning, paywall и onboarding banners, вклучувајќи `PlanGate` и `OnboardingBanner`.

Modal/overlay/banner semantics, elevation и z-index contract остануваат во нивните primitives или локални компоненти.

### 5. Media и device frames — исклучени

- Landing phone mockup, `MapSelector`, QR panels, scanner/video/image/audio frames и `StageMedia`.
- Avatar/icon chips, badges, pills и decorative number/icon containers.

Овие surfaces имаат aspect-ratio, clipping, device или media contract, не Card contract.

### 6. Dark creator/dashboard/player cards — доцни batches

- `creator/**`, `admin/AdminPanel.tsx`, `session/LiveSessionHost.tsx`, `dashboard/**` dark panels и `player/**` surfaces.
- Се мигрираат дури по светлите informational cards, со `tone="dark"` само кога екранот е намерно hard-dark.
- Player/session surfaces остануваат последни поради viewport, game-state и real-time ризик.

## Одобрен фазен редослед

1. **H4a:** Landing `Testimonial`, `Step`, `Audience` — еден production фајл; desktop/mobile Landing browser QA.
2. **H4b:** други едноставни light informational cards — најмногу 10 production фајла, избрани по индивидуален semantic review.
3. **H4c:** dashboard informational/stat cards — без interactive quest/template tiles.
4. **H4d:** creator/admin hard-dark semantic cards со `tone="dark"`.
5. **H4e:** player/session cards, последни, во state-specific мали batches.
6. **H4f:** completion audit што потврдува дека сите преостанати card-like surfaces се или мигрирани или документарно исклучени.

## H4a acceptance contract

- Се менуваат само `Testimonial`, `Step` и `Audience`; FAQ, adventure tiles и decorative frames не се допираат.
- Се зачувуваат точните light palette, padding, border opacity, shadow и Audience hover transform.
- Нема dark-theme repaint на Landing surface.
- Unit/render contracts ги потврдуваат Card usage и уникатните class contracts.
- `tsc --noEmit`, цел Vitest suite и production build мора да поминат.
- Landing browser QA мора да помине на desktop и mobile со нула horizontal overflow и без console errors.

## H4d creator/admin completion audit — 2026-07-23

Valid hard-dark content-card contracts:

- `AdminPanel` template-moderation records — мигрирани во H4d-1.
- `AdminPanel` payment-request records — мигрирани во H4d-1.

Преостанатите creator/admin candidate surfaces се проверени и намерно исклучени:

| Surface | Класификација | Причина за исклучување |
|---|---|---|
| Admin seed section | Action/operation panel | Оркестрира seed/cleanup lifecycle и confirmation actions |
| Admin seed log | Transient operation log | Scrollable status output, не самостојна content единица |
| Admin errors и confirmation errors | Alert | `role="alert"`/modal feedback contract |
| FindSpot map fallback | Media/map fallback | Ја задржува точната map висина и loading state |
| FindSpot/StageEditor empty hints | Empty/help state | Контекстуална порака во editor shell |
| StageList items | Draggable interactive surface | Selection, drag/reorder и nested actions |
| Quest inventory items и learning goals | Editable record rows | Remove/edit actions и form state |
| Public leaderboard lock notice | Paywall notice | Feature-gate feedback, не content card |
| Quest danger zone | Destructive action shell | Delete confirmation lifecycle |
| Share/QR preview panels | Media/print frames | Exact white QR rendering/print contract |
| Rubric criteria и Switch conditions | Editor/form shells | Complex nested inputs и CRUD actions |
| Switch guidance panel | Instructional notice | Contextual editor guidance, не standalone card |

H4d не бара дополнително `Card` API проширување. Механичка миграција на овие surfaces би ги замаглила нивните вистински semantics.

## H4e player/session completion audit — 2026-07-23

Valid player content-card contracts:

- INFO stage description — мигриран во H4e-1.
- TOURNAMENT team task — мигриран во H4e-1.
- Shared rubric preview — мигриран во H4e-1.
- Finish-screen points, achievements и collected-inventory summaries — мигрирани во H4e-2.

Преостанатите player/session candidate surfaces се проверени и намерно исклучени:

| Surface | Класификација | Причина за исклучување |
|---|---|---|
| Player root, loading skeleton и active HUD | Application/game shell | Viewport, loading и live game-state contract |
| Entry onboarding tips | Expandable onboarding region | Disclosure state и dismissal lifecycle |
| Selectable stage rows и Switch paths | Interactive navigation | Selection, lock/completion и routing state |
| Teacher-grade finish panel и grade rows | Async lifecycle panel | Check/loading/error/retry/graded states |
| Feedback и certificate sections | Form/action lifecycle | Submission, loading, success и retry behavior |
| Tournament/leaderboard/map drawers | Overlay/dialog | Focus, dismissal, live data и z-index contract |
| Timer, inventory strip, toast и feedback messages | Status/transient UI | Progress, alert/status или ephemeral feedback semantics |
| Quiz/QR answers и ordering/matching rows | Interactive form controls | Selection, validation, lock и reorder contracts |
| Mission/QR upload zones | Upload/device input | File capture, upload progress и error lifecycle |
| FindSpot location panel | Device-assisted control panel | GPS permission, distance и arrival lifecycle |
| QR/scanner, map, image, video и audio wrappers | Media/device frame | Exact dimensions, clipping и third-party runtime contract |
| JoinSession content | Session-entry form | Code/name validation и submit lifecycle |
| LiveSessionHost create/join panels | Session-control shell | Mode selection, create/copy/start/finish controls |
| Live leaderboard и player rows | Real-time control surface | Ranking updates и per-player moderation actions |
| Live map panel | Real-time map shell | Map viewport, player markers и SOS overlays |
| SOS panel и session errors | Alert | Urgent action and `role="alert"` feedback contract |

H4e не бара нов `Card` tone, variant или API prop. Сите преостанати card-like wrappers имаат поспецифичен semantic contract и остануваат надвор од shared `Card`.
