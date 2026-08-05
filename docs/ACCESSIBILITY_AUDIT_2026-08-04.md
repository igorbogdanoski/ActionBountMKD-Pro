# Accessibility audit — 2026-08-04

## Опсег и стандард

Овој локален audit ги проверува WCAG 2.2 AA релевантните keyboard, focus,
accessible-name, semantic structure, responsive и text-contrast договори на web
апликацијата. Не претставува целосна WCAG сертификација и не заменува човечка
сесија со NVDA, JAWS или VoiceOver.

## Затворени наоди

- Заедничкиот `Modal` се portal-ира во `document.body`, ја прави позадината
  `inert`/`aria-hidden`, го заклучува body scroll-от, го задржува Tab фокусот,
  затвора со Escape и го враќа фокусот на trigger-от.
- Custom-header дијалозите добиваат експлицитно accessible име; Login modal-от
  е именуван, form label-ите се поврзани со input ID, а auth error-от е live
  alert.
- Mobile navigation trigger-от има `aria-expanded` и `aria-controls`; drawer-от
  добива dialog semantics, почетен фокус, Tab trap, Escape close и focus restore.
- Primary и outline Button варијантите користат `brand-700` на светла позадина.
  Мал normal text што претходно користеше `brand-500/600` на светли површини е
  преместен на `brand-700`; декоративните/големи dark-surface accents се задржани.
- `ResultsDashboard`, payment analytics payload-от и portal-aware rubric тестот
  се типски/тестовно усогласени со откриените regression gates.

## Локален browser доказ

Visible Chromium audit на desktop/mobile ги потврди критичните интерактивни
текови: Login dialog name, modal focus trap/restore и mobile drawer open/focus/
Escape/restore. Route scanner-от не најде unnamed controls, unlabeled inputs,
images without alt, duplicate IDs, heading jumps или пресметан contrast failure
на 12 патеки:

`landing`, `changelog`, `privacy`, `terms`, `explore`, `pricing`, `dashboard`,
`settings`, `creator`, `results`, `groups` и `templates`.

Regression доказ:

- focused accessibility/component tests: 35/35 PASS;
- portal/rubric focused regression: 24/24 PASS;
- full Vitest: 684/684 PASS во 82/82 files;
- web и mobile TypeScript: PASS;
- production build: PASS, 3308 modules;
- public Playwright: 12/12 PASS;
- authenticated Playwright: 37 PASS, 3 намерни viewport skips.

## Преостанати граници

- Потребна е посебна човечка assistive-technology сесија со NVDA + Firefox или
  Chrome и VoiceOver + Safari пред формална accessibility изјава.
- Реални user preferences за zoom 200/400%, forced colors, reduced motion и
  долги локализирани strings треба да добијат посебен manual matrix.
- Bundle-budget пакетот е подоцна затворен со R28; следен локален L5 пакет е
  fault-tolerance за offline/reconnect/duplicate-submit.
