# Release и rollback checklist

Ова е fail-closed checklist. Штиклирање без evidence не е release approval.
Commit, push, Vercel/Firebase deploy, EAS build/submission и provider промени
остануваат експлицитни сопственички одлуки.

## 1. Scope и authority

- [ ] Точниот commit/range и вклучените локални промени се прегледани.
- [ ] Unrelated/user-owned промени се исклучени или експлицитно прифатени.
- [ ] Именувани се release owner, verifier и rollback owner.
- [ ] Одобрени се target project/database/bucket/domain/mobile track.
- [ ] Потврдено е дали воопшто е потребен Vercel deploy; quota не се троши за
      rules-only, docs-only, emulator-only или mobile-only промена.

## 2. Локални gates

- [ ] `npm.cmd run test -w web -- --run`
- [ ] `npm.cmd run lint -w web`
- [ ] `npx.cmd tsc --noEmit -p apps/mobile/tsconfig.json`
- [ ] `npm.cmd run test:rules`
- [ ] `npm.cmd run test:backup-restore`
- [ ] `npm.cmd run test:ops-readiness`
- [ ] `npm.cmd run check:ops-readiness`
- [ ] `npm.cmd run test:dependency-policy`
- [ ] `npm.cmd run build -w web` и сите bundle budgets PASS
- [ ] Public и authenticated Playwright матриците PASS/намерните skips се
      објаснети.
- [ ] `git diff --check` и финален source/diff review PASS.

## 3. Data и compatibility gates

- [ ] Live rules/config се прочитани и споредени; не се претпоставува дека се
      исти со repo.
- [ ] Последен production backup е завршен, не само започнат; operation ID,
      UTC време, scope и manifest се запишани.
- [ ] Restore е докажан во non-production target со counts/access probes.
- [ ] L4 result schema-v2 release има одобрена minimum mobile version или
      forced-upgrade стратегија и тестирана old/new client × old/new rules matrix.
- [ ] R19 roster launch release е координиран web + rules; re-export/rotation на
      links е планиран.
- [ ] Migration/rollback не губи v2 telemetry, approval metadata или roster
      identity.

## 4. Secret и provider gates

- [ ] Нема secret во diff, Git history за release range, logs или artifacts.
- [ ] Server secrets се во provider secret store; нема secret со `VITE_` или
      `EXPO_PUBLIC_` prefix.
- [ ] Firebase/GCP/Vercel/EAS/Stripe operators користат named MFA accounts и
      least privilege.
- [ ] Redirect domains, OAuth fingerprints, webhook target/signature и API
      restrictions се проверени.
- [ ] Monitoring/alert destination е тестиран или release risk експлицитно е
      прифатен; локален Sentry adapter без DSN не е production monitoring.

## 5. Release execution record

- [ ] Секој command, operator, UTC време и provider operation/deployment ID се
      запишува без secret values.
- [ ] Не се паралелизираат rules/data/client чекори ако compatibility matrix
      бара редослед.
- [ ] По секој irreversibility boundary има stop/go проверка.
- [ ] Mobile submission останува draft/internal додека physical-device auth,
      notifications и deep-link checks не поминат.

## 6. Post-release verification

- [ ] Landing/legal/login и authenticated owner routes работат.
- [ ] Cross-owner reads/writes се одбиени; anonymous дозволите се точно scoped.
- [ ] Create/play/result/offline retry/grade/approval paths се проверени.
- [ ] Stripe checkout/webhook/portal се проверени без реална наплата освен ако
      е одобрен test/live transaction plan.
- [ ] Error/analytics events немаат PII и пристигнуваат само со consent.
- [ ] 15–30 минутен observation window нема нови errors/latency/backlog spikes.

## 7. Rollback

- [ ] Дефиниран е последен добар web/mobile/rules commit и provider artifact.
- [ ] Code rollback не се меша со data restore: секое бара посебна одлука.
- [ ] Rules rollback се прави само ако останува compatible со веќе пуштените
      clients и data schema.
- [ ] Firestore import/delete, Storage delete/rsync mirror и credential revoke се
      destructive/high-impact чекори со посебно одобрение.
- [ ] По rollback повторно се извршуваат smoke, authorization и data-integrity
      probes и се отвора incident record.

## Release record template

```text
UTC window:
Release owner / verifier / rollback owner:
Commit and artifact IDs:
Target project/database/bucket/domain/track:
Backup operation + manifest:
Approved compatibility sequence:
Commands and provider operation IDs:
Smoke/authorization/data evidence:
Observation result:
Rollback decision/result:
Open risks and owners:
```
