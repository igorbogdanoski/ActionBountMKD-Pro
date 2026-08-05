<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a51fdfb6-fcb6-4135-b6e9-45cc36865fd4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Operational readiness

- Local Firestore export/import drill: `npm run test:backup-restore`
- Secret/runbook contract tests: `npm run test:ops-readiness`
- Repository readiness gate: `npm run check:ops-readiness`
- Procedures: [`docs/OPERATIONAL_READINESS.md`](docs/OPERATIONAL_READINESS.md),
  [`docs/INCIDENT_RESPONSE_RUNBOOK.md`](docs/INCIDENT_RESPONSE_RUNBOOK.md),
  [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md), and
  [`docs/SECRET_INVENTORY.md`](docs/SECRET_INVENTORY.md)
