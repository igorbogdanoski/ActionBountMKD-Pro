# Secret inventory и configuration boundaries

Датум на локална проверка: 2026-08-05

Овој документ содржи имиња, класификација и lifecycle — никогаш вредности.
Локалната проверка не чита provider secret stores и не потврдува дека production
вредностите постојат или се актуелни.

## Browser public configuration

Овие вредности се вградуваат во JavaScript. Не се тајни, но мора да бидат
provider-restricted и да не се користат како authorization контрола.

| Име | Употреба | Контрола |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web client identifier | API restrictions + Firestore/Storage rules |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Authorized domains |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project routing | Rules/IAM се авторитет |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage target | Storage rules |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging identifier | Public client config |
| `VITE_FIREBASE_APP_ID` | Firebase app identifier | Public client config |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase analytics identifier | Public client config |
| `VITE_FIREBASE_DATABASE_ID` | Optional non-default Firestore database | Release matrix + rules |
| `VITE_APP_URL` | Canonical public URL | Allowed redirects/origins |
| `VITE_POSTHOG_KEY` | Browser analytics project token | Consent, domain and ingestion controls |
| `VITE_POSTHOG_HOST` | Analytics endpoint | Approved host |
| `VITE_SENTRY_DSN` | Browser error-ingestion endpoint | Sampling, filtering and abuse limits |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe public identifier | Никогаш secret key |

## Mobile public configuration

Секое `EXPO_PUBLIC_` поле е extractable од app bundle и не смее да содржи secret.

| Име | Класификација |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Public Firebase client identifier |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public Firebase domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Public project identifier |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Public bucket identifier |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Public sender identifier |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Public app identifier |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | Public analytics identifier |
| `EXPO_PUBLIC_APP_URL` | Public canonical URL |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Public OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Public OAuth client ID |

`apps/mobile/google-services.json` и `apps/mobile/GoogleService-Info.plist` се
локални native configuration files: не се третираат како authorization secrets,
но се ignored и не се commit-ираат за да не се мешаат environments и metadata.

## Server configuration и secrets

| Име | Класа | Consumer | Storage/rotation правило |
|---|---|---|---|
| `APP_URL` | Server config | Stripe redirects | Provider env; провери allowlist при domain промена |
| `STRIPE_PRICE_STARTER` | Server config | Checkout API | Provider env; промена со pricing release |
| `STRIPE_PRICE_PRO` | Server config | Checkout API | Provider env; промена со pricing release |
| `GEMINI_API_KEY` | Server secret | Quest-generation API | Server env/secret manager; rotate при exposure/abuse |
| `STRIPE_SECRET_KEY` | Server secret | Checkout/portal/webhook API | Server secret store; rotate веднаш при exposure |
| `STRIPE_WEBHOOK_SECRET` | Server secret | Signature verification | Rotate со controlled overlap и webhook test |
| `FIREBASE_SERVICE_ACCOUNT` | High-impact server secret | Admin APIs/scripts | Secret manager; least privilege; rotate/revoke key |

Server secrets никогаш не добиваат `VITE_` или `EXPO_PUBLIC_` prefix и не се
печатат во logs/errors.

## Operational credentials надвор од app runtime

| Credential | Употреба | Правило |
|---|---|---|
| Google ADC / `GOOGLE_APPLICATION_CREDENTIALS` | Firestore managed export/import | Operator machine/CI identity, least privilege; не во repo |
| `FIREBASE_TOKEN` | Legacy/CI Firebase CLI access | Третирај како password; prefer workload identity/ADC каде е можно |
| `VERCEL_TOKEN` | Vercel administration | Не е потребен за локален QA; rotate при exposure |
| `EAS_TOKEN` | Expo/EAS build administration | Secret store; environment-scoped access |
| Android keystore / Play signing | Mobile release signing | EAS/provider custody или encrypted offline custody |
| Apple certificates/profiles | iOS signing | Apple/EAS managed custody, expiry tracking |
| Stripe/Firebase/GCP owner accounts | Provider administration | MFA, named accounts, least privilege, recovery owner |

## Rotation triggers

- вредност се појавила во Git, build artifact, screenshot, chat или log;
- непознат operator/service account или сомнителен provider event;
- член со privileged access го напушта тимот;
- webhook signature failures или AI/payment usage spike;
- environment/project migration;
- provider-enforced expiry.

При rotation: прво containment, потоа нова вредност, consumer verification,
revoke на старата вредност, audit на периодот на exposure и incident record.

## Автоматска локална контрола

```powershell
npm.cmd run test:ops-readiness
npm.cmd run check:ops-readiness
```

Gate-от проверува classified env surface, secret-shaped public имиња, познати
live credential formats, tracked credential files, `.gitignore` и присуство на
сите operational runbooks. Тој е дополнителна ограда, не замена за provider
secret scanning или историја на Git.
