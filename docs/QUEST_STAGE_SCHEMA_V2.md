# Quest-stage schema v2

Последно ажурирање: 2026-08-05

## Цел

Quest-stage schema v2 го отстранува големиот, слабо валидиран `stages` array од
новите `quests` документи. Parent quest-от е bounded summary, а секој stage е
посебен, строго валидиран `quest_stages` документ. Ова овозможува Firestore Rules
да го проверат целиот nested payload без да го надминат лимитот на изрази.

## Storage договор

Нов parent `quests/{questId}`:

- нема embedded `stages`;
- има `stageSchemaVersion: 2`;
- има `stageRevision` како непразен идентификатор на snapshot;
- има `stageCount` од 0 до 100 (draft quest може да биде празен);
- ги задржува bounded quest metadata, visibility и owner/editor договорот.

Секој `quest_stages/{questId}__{stageId}` документ има:

- `questId`, `stageId`, `creatorId`, `stageRevision` и `order`;
- exact allowlist за својот stage тип;
- identity и revision што мора да се совпаѓаат со parent-от во истиот atomic write.

Поддржани и целосно валидирани типови се `INFO`, `QUIZ`, `MISSION`, `FIND_SPOT`,
`SCAN_CODE`, `QR_TASK`, `SURVEY`, `TOURNAMENT` и `SWITCH`. Shared runtime
validator-от и Firestore Rules имаат исти cardinality, type и string bounds.

## Write и read однесување

Web Creator save запишува parent и сите тековни stages во еден batch, па ги
брише stale stage документите од претходниот snapshot. Quest delete ги брише
stage документите и parent-от во еден batch. Стар клиент не може да создаде нов
legacy parent со embedded stages откако v2 rules ќе се активираат.

Detail readers на web и mobile:

1. го читаат parent-от;
2. за schema v2 ги читаат stage документите;
3. бараат exact count, contiguous order, unique IDs и еднаков revision/creator;
4. fail-close враќаат дека quest-от не е достапен ако snapshot-от е нецелосен или
   невалиден.

Legacy inline quests остануваат читливи за миграција. Public quest листата чита
само summary metadata и `stageCount`; не презема stage payload-и.

## Authorization

- Owner/editor може да запише stage само со валиден parent во atomic write.
- Owner/editor може да избрише stage според parent authorization договорот.
- Owner, валиден collaborator или јавен читател на public quest може да ги чита
  соодветните stage документи.
- Forged document ID, creator, quest ID, revision, extra fields, unknown type,
  oversized nested data и unauthorized collection query се одбиваат.

## Локален доказ

- 30/30 Firestore emulator tests во 5 suites;
- maximum atomic fixture со 100 INFO stages;
- сите девет stage типови и maximum tags/goals/objectives fixture;
- malformed, forged, cross-owner и public/private query probes;
- 700/700 Vitest во 85 files, 16 focused storage/export/editor contracts и 5/5
  migration unit contracts;
- exact emulator backup/restore 6/6;
- web/mobile TypeScript и production build од 3314 modules;
- 70/70 bundle budgets, public browser 12/12 и authenticated 37 PASS/3 намерни
  viewport skips.

## Локален migration tool

Целиот unit + emulator dry-run/apply/repeat drill се пушта со:

```powershell
npm.cmd run test:quest-migration
```

За веќе активен Firestore emulator, inventory е dry-run по default:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8185'
npm.cmd run migrate:quest-stages -- --project demo-local-migration --dry-run
```

По преглед на report-от, истиот isolated emulator може експлицитно да се мигрира:

```powershell
npm.cmd run migrate:quest-stages -- --project demo-local-migration --apply
```

Tool-от прифаќа само `demo-*` project ID и одбива старт без
`FIRESTORE_EMULATOR_HOST`. Dry-run не пишува ништо. Apply користи deterministic
content-addressed revision, atomic parent + stage batch, одбива legacy/stage
conflict и при повторно пуштање го верификува веќе мигрираниот v2 snapshot.

## Production activation и rollback

Овој локален PASS не е production activation. Пред rules deploy:

1. направи production backup според `docs/OPERATIONAL_READINESS.md`;
2. врати одобрен export во isolated emulator и изврши read-only inventory и
   локален dry-run; repo tool-от намерно не прифаќа production project;
3. мигрирај ги legacy parents и stages со проверлив counts/revisions договор;
4. избери minimum mobile version или forced-upgrade механизам;
5. објави web, mobile и Firestore Rules како координиран release;
6. провери owner/editor/public reads, Creator save/delete и cross-owner denial.

Rollback не смее само да ги врати старите rules: стар writer не го разбира v2
storage договорот. Користи го зачуваниот release commit/rules hash и backup-от,
па донеси експлицитна одлука дали се враќаат клиенти и податоци или се коригира
forward. Нема автоматски destructive rollback.
