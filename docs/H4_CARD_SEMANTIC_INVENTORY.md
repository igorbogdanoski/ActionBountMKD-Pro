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
