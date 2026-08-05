# ActionBountMKD Pro — local-first hardening plan

Последно освежување: 2026-08-05

## Цел и правила на извршување

Целта е апликацијата да се зајакнува во мали, мерливи пакети што прво се
докажуваат локално. Vercel и production Firebase не се користат за развојна
проверка. Commit, push, rules deploy и release се посебни сопственички одлуки.

Секој пакет мора да има:

1. јасен threat/quality contract;
2. focused regression тестови;
3. релевантен full suite, TypeScript и production build;
4. browser QA кога има видлива или интерактивна промена;
5. ажуриран hardening ledger со реални, не претпоставени докази.

## Фази

### L0 — Зачувување на докажаната основа

Статус: локално верификувано; delivery одлуката е одложена.

- R18 Firestore bounds/allowlist пакетот останува изолиран од корисничките
  документи.
- Пред следен commit повторно се проверуваат status, diff, 12/12 rules,
  целосен Vitest, web/mobile TypeScript и build.
- Нема push или deploy само за да се добие QA околина.

### L1 — R22 secure local network execution

Статус: repo-controlled делот е реализиран и верификуван; parent environment
чистењето останува надворешна системска задача.

- Да се утврди scope-от на `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- Repo-controlled npm/Firebase child процесите мора да го отстранат insecure
  override-от и експлицитно да користат npm `strict-ssl=true`.
- Да има unit contract што докажува дека сите case variants се чистат без да
  се изгубат другите environment вредности.
- Да се повтори rules suite и dependency audit низ secure runner.

Acceptance доказ: secure-env 2/2 PASS, Firestore rules 12/12 PASS, secure
production audit извршен без Node TLS warning, web/mobile TypeScript PASS,
Vitest 658/658 PASS и production build PASS (3305 modules). Parent environment
ризикот останува видлив додека не се исчисти надвор од репото.

### L2 — R19 opaque roster launches

Статус: локално реализирано и верификувано; production активацијата е одложена.

- Нов `RosterLaunch` contract со opaque 128-bit launch ID, `ownerId`, `groupId`,
  `questId`, `studentId`, display name, active/revoked status, issuedAt и
  expiresAt.
- Новите CSV линкови смеат да содржат само `launchId`; без име и student ID во
  query string, browser history или referrer.
- Owner може да креира, ротира и revoke-ира launch; anonymous player може само
  exact-document `get`, никогаш collection list.
- Roster result мора да содржи `launchId`; Firestore rules го врзуваат со
  quest/student/name, active status и expiry.
- Guest play и live-session flow остануваат компатибилни.

Acceptance: unit/component tests, Firestore emulator cases за forged,
expired, revoked, wrong-quest и unknown launch, плус desktop/mobile browser QA.

Локален доказ: 665/665 целосен Vitest пред финалното module extraction,
93/93 повторени focused contracts по extraction, 18/18 Firestore emulator,
public browser 12/12 и authenticated browser 37 PASS со 3 намерни viewport
skips. Финалната targeted browser проверка е 6/6, web TypeScript и production
build (3306 modules) се PASS. `rosterLaunchStorage` е одделен lazy chunk (0.83
kB) и претходниот Vite dynamic/static-import warning е отстранет. Главниот
chunk на овој L2 baseline беше 423.42 kB; подоцна е затворен со L5/R28.

Production преод: старите PII-bearing roster URL-и намерно fail-close. Идната
активација мора координирано да ги пушти web + Firestore rules и потоа
наставниците да извезат нови линкови; ова не е извршено локално.

Ограничување: ова го намалува PII leakage и овозможува revoke/expiry, но
поседувачот на активниот линк сè уште е bearer. Вистински PIN, one-time redeem
и rate limiting бараат trusted server path.

### L3 — R15 dependency compatibility

Статус: локално реализирано и верификувано; upstream advisory исклучоците се
контролирани со повторлива policy проверка.

- React Router RSC и `uuid` advisory патеките се мапирани до нивните реални roots.
- Firebase Admin е надграден на 14.2.0 и сите API модули користат modular imports.
- Expo SDK 56 пакетите се усогласени со `expo install`; Doctor е 21/21.
- Web/mobile користат една React 19.2.3 runtime. Router 8.3 пробата е повлечена:
  бара React 19.2.7, што е некомпатибилно со Expo SDK 56 pin-от во заедничкиот
  npm workspace.
- React Router останува на 7.18.2; репото е declarative SPA и policy check-от
  забранува unstable RSC API. `uuid` останува само транзитивно во Expo tooling и
  optional Firebase Admin storage graph; директен app import е забранет.
- Нема `audit fix --force`, downgrade, broad override, cloud или Vercel повик.
- Додадени се secure npm runner, dependency-policy тест и документ за исклучоците.

Acceptance: production audit е 19 наоди (2 high RSC paths + 17 moderate `uuid`
paths), секој објаснет по advisory root; web/mobile TypeScript, 666/666 Vitest,
18/18 rules, API import smoke, build од 3306 модули, public browser 12/12 и
authenticated browser 37 PASS/3 намерни viewport skips поминуваат. Browser QA
откри и затвори Creator autosave debounce race со посебен regression тест.

### L4 — R23 result/telemetry + quest-stage schema v2

Статус: result/telemetry и quest-stage гранките се локално реализирани и
верификувани; production activation е задржана до legacy quest migration dry-run,
minimum mobile-version/forced-upgrade одлука и координиран clients + rules release.

- `submissions`, `quizAnswers` и `stageDurations` да се разделат во bounded
  документи/subcollections или да минуваат низ trusted write service.
- Старите резултати остануваат читливи; новите записи се idempotent и строго
  schema-валидирани.
- Migration/read adapters прво се докажуваат со локален emulator fixture.

Acceptance: authorization matrix и malformed-data suite без надминување на
Firestore rules expression limit; документиран rollback.

Реализација: shared splitter/hydrator создава immutable v2 parent summary и
deterministic bounded telemetry (`progress` до 3 durations + 3 quiz answers,
`submissions` точно една ставка). Web/mobile и offline replay користат ист
idempotent write path. Parent и секој telemetry документ се запишуваат во
ordered atomic commits; read adapter-от fail-close ги крие нецелосните v2
резултати, а legacy inline резултатите остануваат читливи. Деталниот release и
rollback договор е во `docs/RESULT_SCHEMA_V2.md`.

Result доказ: 22/22 Firestore emulator правила, вклучително максимални 100 durations,
100 quiz answers и 30 submissions; 673/673 Vitest; web/mobile TypeScript;
production build од 3307 модули; public browser 12/12 и authenticated browser
37 PASS/3 намерни viewport skips. Production rules/mobile release не е направен.

Quest-stage реализација: schema-v2 parent quest чува само bounded summary
(`stageSchemaVersion`, `stageRevision`, `stageCount`), а целосните payload-и се во
`quest_stages`. Shared contract-от fail-close ги валидира сите девет stage типови,
точните nested allowlist-и, редоследот, revision/creator врските и максимум 100
stages. Web save/delete користи atomic batch, public листата не ги презема stage
payload-ите, а web/mobile detail readers прифаќаат legacy inline quests и кријат
нецелосен или невалиден v2 запис. Account export и локалниот backup/restore drill
го покриваат новиот collection. Release и migration договорот е во
`docs/QUEST_STAGE_SCHEMA_V2.md`.

Quest-stage доказ: 30/30 Firestore emulator правила во 5 suites, вклучително
atomic quest со 100 INFO stages, сите девет типови, combined maximum
tags/goals/objectives и malformed/forged/query authorization probes; 700/700
Vitest во 85 files; 16 focused storage/export/editor contracts; exact локален
backup/restore 6/6; web/mobile TypeScript; production build од 3314 модули и
70/70 bundle budgets; public browser 12/12 и authenticated browser 37 PASS/3
намерни viewport skips. Нема production rules/mobile release, Vercel повик,
commit, push или deploy.

Migration tooling: `npm.cmd run test:quest-migration` потврдува 5/5 pure
договори и emulator dry-run 1/1 → apply 1/1 → repeat v2 verification 1/1.
`migrate:quest-stages` е dry-run по default, бара `FIRESTORE_EMULATOR_HOST`,
прифаќа само `demo-*` project ID, користи deterministic revision/atomic batch и
fail-close одбива невалидни legacy записи или веќе постоечки stage conflict.

### L5 — product-quality и operational readiness

Статус: privacy/export/delete-request, accessibility, bundle-budget,
offline fault-tolerance и operational-readiness пакетите се локално реализирани
и верификувани. Production monitoring, scheduled backups и provider restore
остануваат H8/environment задачи.

- [x] privacy/data export/delete-account audit:
  - Settings self-service JSON ги извезува owner-readable profile/settings,
    quests/groups, payment requests и quest results/telemetry/feedback;
  - export-от намерно ги означува Auth metadata, Storage binaries и
    non-enumerable roster/session документи како trusted/manual archive scope;
  - `account_deletion_requests/{uid}` има owner/admin state machine, Auth-email
    binding и exact-email UI потврда; browser-от не тврди дека erase е завршен;
  - privacy policy, Play Store одговорот, Storage comment и деталниот lifecycle
    matrix се усогласени со реалниот код во `docs/ACCOUNT_DATA_LIFECYCLE.md`;
  - actual Auth/Firestore/Storage cascade erase и private submission-media
    access остануваат trusted-service/provider gate.
- [x] keyboard, focus, semantic screen-reader proxy, contrast и responsive QA:
  - Modal позадината е inert, фокусот е заробен/вратен, Escape работи и секој
    custom-header dialog има accessible име;
  - Login form labels, live error и decorative content имаат точни semantics;
  - mobile drawer има expanded/controls/dialog договор, почетен фокус, Tab trap,
    Escape close и focus restore;
  - primary/outline actions и мал brand text на светли површини користат AA
    contrast-safe `brand-700`;
  - деталниот опсег и ограничувањата се во
    `docs/ACCESSIBILITY_AUDIT_2026-08-04.md`; човечка NVDA/VoiceOver сесија
    останува release-readiness gate, не е симулирана.
- [x] bundle budgets:
  - `react-dom/client` е преместен од entry во `vendor-react`;
  - Firebase app/auth, Firestore и Storage имаат независни chunks, а profile
    storage се вчитува динамички само по authenticated user event;
  - entry е намален 427.72 → 196.40 kB raw, а initial JS 968.45 → 599.68 kB;
  - production build fail-closed проверува 70 raw/gzip лимити; policy и точни
    мерења се во `docs/BUNDLE_BUDGET_POLICY.md`.
- [x] offline/reconnect/duplicate-submit fault tolerance:
  - sync го помирува успешно запишаниот snapshot со најновата queue состојба,
    па резултат додаден за време на network write не се брише;
  - web и mobile exact retry со ист `attemptId` е no-op, а ист ID со различен
    payload се одбива fail-closed;
  - mobile AsyncStorage read-modify-write операции се serialised за паралелни
    appends да не се пребришуваат;
  - преклопени reconnect повици делат еден sync pass, а web/mobile finish
    producer-ите дозволуваат само едно започнато поднесување по обид;
- [x] operational readiness:
  - реален Firestore emulator export е внесен во нов emulator процес и сите 6
    документи се споредени exact, вклучително nested arrays, македонски Unicode
    и schema-v2 telemetry/quest stage;
  - fail-closed secret gate проверува 4 задолжителни runbook-и, 30 класифицирани
    environment entries и 339 repository текстуални датотеки;
  - secret inventory, incident-response runbook и release/rollback checklist се
    документирани во `docs/SECRET_INVENTORY.md`,
    `docs/INCIDENT_RESPONSE_RUNBOOK.md` и `docs/RELEASE_CHECKLIST.md`;
  - локалниот drill не се претставува како production backup: managed export,
    Auth/Storage archive, non-production restore, monitoring и одобрени RPO/RTO
    остануваат provider/owner gate.

Локален доказ по accessibility пакетот: 684/684 Vitest во 82/82 files, 26/26
Firestore emulator (carried непроменет rules baseline), web/mobile TypeScript,
production build од 3308 modules, public browser 12/12 и authenticated browser
37 PASS/3 намерни viewport skips. Дополнителен visible Chromium route audit на
12 public/auth патеки нема unnamed controls, unlabeled inputs, missing alt,
duplicate IDs, heading jumps или пресметан contrast failure.

### L6 — H8 external integrations

Статус: блокирано од product/provider избор, не од локален код.

- billing lifecycle;
- consent-aware onboarding email;
- production monitoring/alerting;
- automated backup jobs;
- trusted PIN/one-time roster redeem service.

Оваа фаза се активира само со избрани провајдери, клучеви внесени преку
локални secret stores/CLI и експлицитно одобрен production deploy.

## Тековен редослед

1. L2/R19 е локално реализиран; чувај ја production активацијата како одделна
   координирана web + rules + re-export одлука.
2. L3/R15 е локално реализиран; задржи ги Router/uuid исклучоците под policy gate
   додека Expo/upstream compatibility не овозможи safe upgrade.
3. L4/R23 result, quest-stage и emulator migration-tooling гранките се локално
   реализирани; пред production activation врати одобрен export во isolated
   emulator за data-specific inventory, избери minimum mobile version/forced-upgrade
   механизам и пушти coordinated clients + rules release.
4. L5 privacy/export/delete-request, accessibility, bundle-budget,
   offline/reconnect/duplicate-submit fault-tolerance и operational readiness се
   локално затворени. Production backup/restore, monitoring/alerting и одобрени
   RPO/RTO остануваат H8/provider gates. Следниот repo-only кандидат е R24
   emulator-tested trusted account erase worker core; hosting, credentials и
   production извршување остануваат посебен provider/owner gate.
5. Исчисти го parent TLS override-от во доверливата host/Codex околина кога
   таа конфигурација е достапна, па повтори `audit:secure`.
