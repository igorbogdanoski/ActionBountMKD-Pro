# Incident response runbook

## Активирање и приоритет

| Ниво | Пример | Почетна реакција |
|---|---|---|
| P0 | потврдена масовна data loss/exposure, account takeover, signing-key compromise | веднаш; стоп на releases и именуван incident commander |
| P1 | активен auth/rules bypass, payment/webhook compromise, голем outage | веднаш во работно време/дежурство |
| P2 | ограничена деградација, retry backlog, неуспешен deploy без data loss | ист ден |
| P3 | мал дефект без security/data impact | нормален backlog |

Нема формално одобрен 24/7 on-call или SLA. Ако нема достапен сопственик,
операторот смее да презема само минимални, реверзибилни containment чекори во
рамките на веќе доделените права.

## Првите 15 минути

1. Отвори incident record со UTC време, reporter, environment и симптом.
2. Назначи incident commander и recorder; една личност ја координира одлуката.
3. Стопирај commit/push/deploy/rules/release операции поврзани со incident-от.
4. Зачувај evidence: request IDs, provider event IDs, release/commit, rules hash,
   screenshots без secrets и exact error text. Не копирај tokens или user data.
5. Одреди blast radius: Auth, Firestore, Storage, Vercel/API, Stripe, AI, mobile.
6. Ако има credential exposure, следи rotation matrix од
   `docs/SECRET_INVENTORY.md`; не ротирај половично без consumer plan.
7. Ако има сомнеж за data corruption, стопирај writes само со експлицитно
   одобрена provider контрола; не извршувај import/delete како дијагностика.

## Дијагностички пакет

- точна UTC временска линија и timezone;
- засегнати routes, project/database/bucket IDs и client versions;
- последен познат добар release и последен успешен backup operation ID;
- `git rev-parse HEAD`, worktree status и hashes на rules;
- локални test/build/rules резултати релевантни за дефектот;
- provider status/event/log references со redaction;
- број на засегнати записи/корисници само ако е докажан.

Не се тврди root cause додека exact trigger и evidence не се повторливи или
потврдени од provider logs.

## Containment по тип

### Auth или authorization

- revoke/disable само точно идентификуван account/key/session;
- спореди live rules со release hash;
- провери owner и cross-owner access во non-production/emulator;
- не ослабувај rules за да „проработи“ клиентот.

### Firestore corruption или deletion

- замрзни release промени и запиши последен добар write window;
- идентификувај export operation што претходи на corruption;
- restore прво во non-production target според `OPERATIONAL_READINESS.md`;
- production import бара второ одобрение и комуникациски план.

### Storage media exposure

- containment преку најтесна rules/IAM промена;
- зачувај object metadata и access evidence;
- не бриши media пред legal/owner одлука и recoverable copy.

### Stripe/payment

- не менувај plan state рачно како примарна поправка;
- потврди webhook signature/event ID и Stripe authoritative state;
- rotate webhook/secret само со controlled overlap и replay/idempotency проверка.

### AI abuse или key exposure

- disable/rotate server key, постави quota/provider restriction;
- провери дека нема `VITE_`/`EXPO_PUBLIC_` exposure;
- зачувај usage window без prompt/user PII во incident record.

## Recovery и closure

Recovery е завршен само кога:

- containment е потврден и нема нови anomalous events;
- data verification/count/access probes поминале;
- public и authenticated smoke QA поминале на релевантниот artifact;
- monitoring/owner рачно ја потврдил стабилноста;
- привремените права/flags се вратени;
- корисничка/регулаторна комуникација е оценета од сопственикот;
- follow-up задачите имаат owner и рок.

Post-incident записот мора да содржи impact, timeline, evidence-backed root
cause или „неутврдено“, recovery, што детектирало/не детектирало, corrective
actions и датум за повторен drill. Никогаш не се брише evidence за да изгледа
incident-от „чист“.
