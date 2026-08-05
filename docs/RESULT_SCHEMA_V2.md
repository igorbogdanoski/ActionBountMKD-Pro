# Result/telemetry schema v2

## Цел

`quest_results` повеќе не ги чува `stageDurations`, `quizAnswers` и
`submissions` како големи inline листи. Новиот запис е мал, immutable summary,
а telemetry се чува во bounded документи во `quest_result_telemetry`.

Ова е локално реализиран R23 пакет. Не е production-активиран и не бара Vercel
или trusted server.

## Запис

Parent документот `quest_results/{attemptId}` содржи:

- `schemaVersion: 2`;
- `id == attemptId == document ID`;
- постојните identity, score и completion summary полиња;
- `stageDurationCount`, `quizAnswerCount` и `submissionCount`;
- нема inline telemetry, grades или approval полиња при player create.

Telemetry документот има deterministic ID
`{attemptId}__{kind}__{chunkId}` и содржи `resultId`, `questId`, `kind`,
`chunkId`, `chunkIndex` и една bounded payload листа/група:

- `progress`: најмногу 3 durations и 3 quiz answers;
- `submissions`: точно една submission, со најмногу 20 survey answers.

Rules го врзуваат секој chunk со постоечкиот v2 parent преку `getAfter`, го
проверуваат exact allowlist-от, типовите, должините, count/cardinality и
document identity. Create и идентичен retry се дозволени; payload mutation и
delete се забранети. Само сопственикот на quest-от може да ги чита parent и
telemetry документите.

## Write/read протокол

Web и mobile прво го валидираат целиот in-memory резултат. Потоа го запишуваат
parent-от и секој telemetry документ во посебен ordered atomic batch. Ова е
намерна граница: emulator тестот докажа дека поголем telemetry документ или
повеќе целосно валидирани telemetry документи во ист request може да го надмине
Firestore лимитот од 1000 rule expressions.

Протоколот е idempotent. Offline retry повторно ги испраќа истите deterministic
документи; rules дозволуваат само byte-equivalent/no-op update. Ако sync запре
по parent-от или меѓу chunk-ови, read adapter-от бара точен број, редослед,
identity и cardinality на сите chunk-ови и го крие нецелосниот v2 резултат.
Следниот retry го довршува истиот attempt наместо да создава дупликат.

Legacy inline резултатите без `schemaVersion: 2` остануваат читливи без data
migration. Новите readers ги хидрираат само комплетните v2 записи.

## Production activation

Овој пакет не смее да се deploy-ира изолирано. Новите rules намерно одбиваат
legacy inline create, па стар инсталиран mobile client би престанал да зачувува
резултати.

Потребниот production gate е:

1. потврден minimum mobile app version или друг механизам за задолжително
   ажурирање;
2. координирано пуштање на web/mobile producers, v2 readers и Firestore rules;
3. emulator suite, production-like smoke со тест quest и проверка на offline
   retry пред општа активација;
4. без Vercel deploy ако промената не го бара тоа; Firestore rules/mobile release
   се одделни контролирани операции.

## Rollback

- Пред првиот production v2 запис: producers и rules може заедно да се вратат.
- По првиот v2 запис: reader adapter-от мора да остане активен. Не се враќа стар
  reader што очекува inline arrays; се стопираат новите writes и се оди со
  fix-forward.
- Не се бришат v2 parent или telemetry документи. Legacy и v2 записите остануваат
  паралелно читливи од новиот adapter.
- Пред активација се прави export/backup и се евидентира точниот rules/client
  release pair.

## Локални acceptance докази

- максимални 100 durations, 100 quiz answers и 30 submissions;
- malformed nested maps, погрешни типови и out-of-range chunk;
- immutable retry и owner-scoped telemetry query;
- legacy inline read и fail-closed incomplete hydration;
- web/mobile TypeScript, unit suite, build и browser QA пред означување како
  production-ready.
