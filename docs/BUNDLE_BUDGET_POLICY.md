# Web bundle-budget policy

## Цел

Production build-от мора fail-closed да спречи незабележано враќање на ReactDOM,
Firestore, Firebase Storage или тешки route-only библиотеки во почетниот bundle.
Gate-от работи целосно локално и не повикува Vercel или друг cloud сервис.

## Архитектурни граници

- `react-dom/client` е во `vendor-react`, не во entry chunk-от.
- Firebase bootstrap-от е поделен на app/auth, Firestore и Storage chunks.
- Јавниот bootstrap preload-ира само entry, React и Firebase Auth.
- Firestore профилот се вчитува динамички само по authenticated user event.
- Firebase Storage останува route/feature-only зависност.
- `AuthContext` користи тесен `profileStorage` модул наместо целиот `storage.ts`
  graph со quests, results, offline queue и shared Zod schemas.

## Намалување од потврдениот baseline

Vite decimal-kB build output:

| Мера | Пред | Потоа | Намалување |
|---|---:|---:|---:|
| Entry raw | 427.72 kB | 196.40 kB | 54.1% |
| Entry gzip | 131.96 kB | 63.03 kB | 52.2% |
| Initial JS raw | 968.45 kB | 599.68 kB | 38.1% |
| Initial JS gzip | 264.01 kB | 172.09 kB | 34.8% |

Budget gate-от известува binary KiB: тековниот initial JS е 585.62 KiB raw /
168.06 KiB gzip, а entry е 191.79 KiB raw / 61.56 KiB gzip.

## Gates

- initial JS: 650 KiB raw / 190 KiB gzip;
- entry: 215 KiB raw / 70 KiB gzip;
- initial CSS: 125 KiB raw / 20 KiB gzip;
- React, Firebase auth/firestore/storage и сите големи optional vendor chunks
  имаат посебни raw/gzip лимити;
- секој од 18-те именувани route chunks е ограничен на 125 KiB raw / 35 KiB
  gzip.

Вкупно се проверуваат 70 лимити. Лимитот е дозволен точно на границата, а
еден byte над него е failure.

## Команди

```powershell
npm.cmd run test:bundle-budget
npm.cmd run check:bundle
npm.cmd run build -w web
```

`npm run build -w web` автоматски го извршува budget checker-от по успешен Vite
build. Не зголемувај лимит само за да помине build; прво измери го source graph-от
и документирај зошто дополнителниот payload е неопходен.
