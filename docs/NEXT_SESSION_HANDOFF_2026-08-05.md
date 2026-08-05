# Next-session handoff — 2026-08-05

## Репо состојба

- Repository: `igorbogdanoski/ActionBountMKD-Pro`
- Local checkout: `C:\Users\pc4all\Downloads\ActionBountMKD Pro`
- Branch: `main`
- Овој документ е дел од локалниот hardening checkpoint commit.
- Нема push, Vercel deploy, Firebase Rules deploy, cloud migration или release.
- Vercel квотата е надмината; продолжи local-first и користи cloud само по
  експлицитна потреба и одобрение.
- Корисничките промени во `docs/DELOVNA_STRATEGIJA.md`,
  `docs/FINALEN_IZVESTAJ.md` и `.codex/` не се дел од checkpoint commit-от.

## Што е локално завршено

- H1–H7 UI, accessibility, objectives/mastery и regression hardening.
- L1/R22 repo-controlled secure network execution.
- L2/R19 opaque roster launch lifecycle.
- L3/R15 dependency compatibility и Creator autosave race.
- L4/R23 result/telemetry schema v2.
- L4/R23 quest-stage schema v2 за сите девет stage типови.
- Emulator-only legacy quest migration tooling со dry-run default, deterministic
  revision, conflict detection и atomic apply.
- L5 privacy export/delete-request contract, accessibility, bundle budgets,
  offline/reconnect fault tolerance и operational-readiness пакет.
- Account export и backup/restore го покриваат `quest_stages` collection-от.

Главни договори:

- `docs/LOCAL_FIRST_HARDENING_PLAN.md`
- `docs/HARDENING_EXECUTION_LEDGER.md`
- `docs/QUEST_STAGE_SCHEMA_V2.md`
- `docs/RESULT_SCHEMA_V2.md`
- `docs/ACCOUNT_DATA_LIFECYCLE.md`
- `docs/OPERATIONAL_READINESS.md`
- `docs/RELEASE_CHECKLIST.md`

## Последна зелена верификација

- Full Vitest: 700/700 во 85 files.
- Firestore Rules: 30/30 во 5 suites.
- Quest migration: 5/5 unit; dry-run 1/1; apply 1/1; repeat v2 verification 1/1.
- Focused quest storage/export: 10/10 во последниот re-check; 16 вкупни
  stage/storage/export/editor contracts во R23 batch-от.
- Backup/restore: 6/6 exact.
- Web TypeScript: PASS.
- Mobile TypeScript: PASS.
- Production build: 3314 modules; 70/70 bundle budgets.
- Public browser: 12/12 desktop/mobile.
- Authenticated browser: 37 PASS и 3 намерни viewport skips.
- Operational readiness: 4 runbooks, 30 environment entries и 339 repository
  text files.
- `git diff --check`: PASS; остануваат само Windows LF/CRLF warnings.
- QA ports 3000/3100 и emulator ports 8185/8186 се затворени.

Firebase Admin може да испечати `MetadataLookupWarning` при локално emulator
shutdown без ADC. Migration drill-от сепак завршува со exit 0 и exact
dry-run/apply/repeat verification; synthetic credential пробата беше повлечена
бидејќи Admin правилно не ја прифати за Firestore.

## Што останува

1. **R24 trusted account erase worker core** — следен repo-only кандидат.
   Имплементирај го прво со emulator fixtures, idempotency, dry-run, exact scope,
   request-state transition и fail-closed protection. Нема production execute.
2. **R25 private submission media lifecycle** — trusted upload/access, retention,
   moderation и cascade erase; бара backend/provider architecture.
3. **R19/R23 production activation** — бара одобрен backup/export, data-specific
   inventory во isolated emulator, minimum mobile version/forced upgrade и
   координиран web + mobile + Firestore Rules release.
4. **R22 host cleanup** — parent `NODE_TLS_REJECT_UNAUTHORIZED=0` се чисти надвор
   од репото, потоа се повторува secure audit.
5. **Human accessibility gate** — реална NVDA/VoiceOver сесија; automation не се
   претставува како човечка сертификација.
6. **H8 provider choices** — billing, onboarding email, monitoring/alerting,
   scheduled production backup, RPO/RTO и institutional operations.
7. Push/deploy/release остануваат забранети без нова експлицитна сопственичка
   потврда.

## Почеток на следната сесија

```powershell
git status --short --branch
git log -3 --oneline
npm.cmd run check:ops-readiness
npm.cmd run test:quest-migration
```

Потоа прочитај ги `docs/LOCAL_FIRST_HARDENING_PLAN.md` и
`docs/HARDENING_EXECUTION_LEDGER.md`, потврди дека корисничките unstaged датотеки
се недопрени и започни со R24 emulator-only erase worker core.
