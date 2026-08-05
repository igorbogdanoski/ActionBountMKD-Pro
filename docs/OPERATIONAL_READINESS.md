# Operational readiness и backup/restore

Датум на локална проверка: 2026-08-05

## Статус и граница на доказот

Локално е автоматизиран Firestore emulator export → shutdown → fresh import →
exact verification drill. Командата е:

```powershell
npm.cmd run test:backup-restore
```

Drill-от користи исклучиво `demo-actionbountmkd-backup-drill`, локален emulator
на `127.0.0.1:8186` и synthetic `.example.test` податоци. Проверува export
manifest, шест документи од критичните collections, nested payload-и, schema-v2
telemetry и quest stage, Unicode и точни collection counts. Успешните привремени artifacts се
бришат само од валидираната `.firebase-local/backup-drills/` патека; при неуспех
се задржуваат и се печати точната дијагностичка патека.

Овој PASS не докажува production backup. Не ги проверува production IAM,
billing, реалниот број документи, Authentication users, Storage media,
retention/immutability или реално recovery време.

## Податочна површина

| Површина | Авторитативни податоци | Backup механизам | Локален доказ |
|---|---|---|---|
| Firestore | users, quests, quest stages, groups, results, telemetry, sessions, requests | Managed Firestore export во одделен Cloud Storage bucket | Emulator export/import PASS (6/6 exact) |
| Firebase Authentication | кориснички сметки и hash metadata | Firebase CLI `auth:export`; restore само во одобрена target околина | Не е production-тестиран |
| Firebase Storage | submission media и други upload-и | versioned/retained backup bucket или контролиран `gcloud storage rsync` | Не е production-тестиран |
| Firestore/Storage rules | authorization policy | Git commit + точен hash + live rules capture пред release | Repo rules се локално тестирани |
| Vercel configuration | web artifact и server environment | provider configuration/export + secret inventory; не е data backup | Не е повикан Vercel |
| Stripe | payment/customer state | Stripe е авторитативен; локалната база чува само app lifecycle state | Provider restore не е тестиран |
| Browser/mobile offline queue | привремен retry buffer | Нема institutional backup гаранција | Fault-tolerance тестови PASS |

## Production backup gate

Следните чекори се операторски и не смеат автоматски да се извршат од локалниот
hardening процес:

1. Добиј експлицитно одобрение за project ID, database ID, bucket, трошок и
   retention. Firestore managed export бара billing/Blaze и наплатува reads и
   storage.
2. Запиши release commit, hashes на `firestore.rules`/`storage.rules`, mobile
   minimum version и точна UTC ознака.
3. Креирај export во backup bucket што не е јавен и не е Requester Pays/Rapid:

   ```text
   gcloud firestore export gs://<BACKUP_BUCKET>/<UTC_PREFIX> --database='<DATABASE_ID>'
   ```

4. Чекај operation success; не прифаќај само „started“. Во manifest-от запиши
   operation ID, object prefix, document/collection coverage и failure details.
5. Извези Authentication users во енкриптиран operator-only artifact:

   ```text
   firebase auth:export <ENCRYPTED_LOCAL_OR_CONTROLLED_PATH>/auth-users.json --project <PROJECT_ID> --format=json
   ```

6. За Storage прво изврши `gcloud storage rsync --dry-run --recursive`, прегледај
   го scope-от, па копирај само по одобрение во versioned/retained backup target.
   Не користи delete-mirroring flag без посебно destructive одобрение.
7. Шифрирај ги operator artifacts, запиши checksum, owner, retention и delete
   date. Не ги ставај во репото, issue, chat или CI log.

## Restore gate

1. Incident commander го потврдува source export-от и target environment-от.
2. Restore прво оди во празна non-production target база/проект.
3. Провери representative документи, counts по collection group, telemetry
   completeness, owner access и denied cross-owner access.
4. Authentication import се прави само со точниот JSON/hash contract и во
   одобрена target околина; OAuth provider конфигурацијата се проверува одделно.
5. Storage restore прво е dry-run и проверува media count/checksums.
6. Production import бара второ експлицитно одобрение и maintenance/communication
   план. Firestore export не е атомска snapshot точка и може да содржи промени
   направени додека export-от траел.
7. По restore се извршуваат rules tests, smoke QA, owner/cross-owner probes и
   резултатот се запишува во incident/release record.

## RPO и RTO

Нема одобрен institutional RPO/RTO или автоматизиран production backup schedule.
Тие не смеат да се претставуваат како SLA. Пред production automation,
сопственикот треба да одобри:

- прифатлива загуба на податоци (RPO);
- максимално време за опоравување (RTO);
- backup фреквенција, retention и geographic location;
- оператори со export/import и key-access права;
- monitoring provider и канал за алармирање.

## Поврзани контроли

- `docs/INCIDENT_RESPONSE_RUNBOOK.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/SECRET_INVENTORY.md`
- `docs/RESULT_SCHEMA_V2.md`
- `docs/QUEST_STAGE_SCHEMA_V2.md`
- `docs/ACCOUNT_DATA_LIFECYCLE.md`
