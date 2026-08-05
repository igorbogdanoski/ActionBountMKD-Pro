# Account data lifecycle

Последно ажурирање: 05.08.2026

Овој документ го опишува реалниот локален L5 договор. Self-service функциите
не се претставуваат како целосен backend archive/erase процес.

## Површини и сопствеништво

| Површина | Owner key | Self-service JSON | Browser delete | Контролиран начин на бришење |
|---|---|---:|---:|---|
| Firebase Authentication | `uid` | Делумно, само identity од активната сесија | Не | Trusted Admin SDK; може да бара recent sign-in за client delete |
| `user_profiles/{uid}` | document ID | Да | Не | Trusted erase job |
| `user_settings/{uid}` | document ID | Да | Rules дозволуваат owner write, но account erase мора да е координиран | Trusted erase job |
| `quests` | `creatorId` | Да | Да, само quest документот | Trusted cascade за поврзани stages, results, telemetry, feedback, launches и media |
| `quest_stages` | `creatorId` + `questId` | Да | Да, преку Creator quest delete batch | Trusted cascade за orphan/stale stage cleanup |
| `class_groups` | `ownerId` | Да | Да | Owner или trusted erase job |
| `quest_results` | quest ownership | Да, за сопствени quests | Не | Trusted erase job |
| `quest_result_telemetry` | quest ownership | Да, за сопствени quests | Не | Trusted erase job |
| `quest_feedback` | quest ownership | Да, за сопствени quests | Не | Trusted erase job |
| `payment_requests` | `userId` | Да | Не | Retention/legal review, потоа trusted erase/anonymize job |
| roster launches/sets | owner во документот | Не се enumerable од client | Не | Trusted query/cascade job |
| live game sessions | host ownership | Не е вклучено во JSON | Ограничено lifecycle бришење | Trusted expiry/cleanup job |
| Storage user uploads | path `folder/{uid}` | Само референци ако се во Firestore | Owner delete за owner paths | Owner или trusted erase job |
| Storage submissions | path `submissions/{questId}` | Не, само зачувани URL референци | Не | Trusted Admin Storage erase job |
| Browser local data | `ak_`, `av_`, `avk_`, `ab_`, `actionbound_` prefixes | Да | Корисникот може локално да исчисти site data | Browser/site-data cleanup |

## Реализиран client договор

- Settings → Сметка создава JSON export од профил, поставки, сопствени
  авантури/групи, payment requests и поврзаните results/telemetry/feedback.
- Export-от додава canonical Firestore document IDs и намерно не извезува
  неповрзани browser storage клучеви или Firebase auth storage.
- Export-от експлицитно ги наведува површините за кои е потребна рачна/trusted
  архива: Authentication metadata, Storage binaries и non-enumerable live/roster
  документи.
- `account_deletion_requests/{uid}` е auditable request, не доказ за завршено
  бришење. Корисникот може да создаде/повтори `pending` и да откаже само додека
  е `pending`; само admin може да премине во `in_progress`, `completed` или
  `rejected`.
- Потврдата во UI бара точно внесување на email адресата на активната сметка.

## Trusted erase checklist

Пред статус `completed`, доверливиот worker мора idempotent да:

1. го заклучи барањето како `in_progress` и да зачува audit timestamps;
2. ги пронајде сите owner quests/groups и нивните поврзани results, telemetry,
   feedback, roster launches/sets и active sessions;
3. ги избрише Storage user uploads и submissions за тие quests;
4. ги избрише или законски да ги минимизира payment/audit записите;
5. ги избрише Firestore профилот, поставките и преостанатите owner записи;
6. го избрише Firebase Authentication корисникот преку Admin SDK;
7. го означи request audit записот `completed` само по повторна проверка дека
   нема orphaned records.

Worker-от мора да поддржува retry без двојни несакани ефекти, dry-run inventory,
structured audit log и fail-closed status. Овој trusted worker не е пуштен и не
е симулиран како production-ready во browser кодот.

## Отворен privacy ризик

`submissions/{questId}/...` прифаќа anonymous media upload и е јавно readable
кога е позната точната патека/URL, а client delete е забранет. Ова е свесно
документиран ризик, не затворена контрола. Следната architecture одлука треба да
воведе trusted upload/access path (на пример signed access, moderation/retention
policy и server-side erase) без да го прекине anonymous player flow.
