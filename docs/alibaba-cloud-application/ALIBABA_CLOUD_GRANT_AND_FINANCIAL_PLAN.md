# Avantura MKD Pro — Technical Documentation & Investment Proposal

**Prepared for:** Alibaba Cloud — Cloud Infrastructure, Investment & Strategic Partnership
**Product:** Avantura MKD Pro (avantura.mismath.net) — Skopje, North Macedonia
**Founder:** Igor Bogdanoski (full-stack engineer, math teacher, sole developer)
**Date:** July 2026
**Document version:** 1.0

---

## 1. Executive Summary

**Avantura MKD Pro** is a production-ready, Macedonian-built platform for GPS-based, location-driven interactive learning adventures — teachers design multi-stage "quests" that combine real-world GPS checkpoints, QR-code stations, quizzes, missions, surveys, team tournaments and conditional branching, and students complete them on a phone, outdoors or on school grounds, instead of sitting through a static lesson.

The product is **live in production** at avantura.mismath.net, with a React 19 web app, a companion Expo/React Native mobile app, and a shared TypeScript domain model between them. It has gone through a sustained, multi-month engineering hardening programme — stable per-student identity, idempotent attempt tracking, teacher-approval workflows, and a curriculum-objective mastery model — that is unusually mature for a solo-founder EdTech product at this stage.

**The opportunity:** outdoor, project-based and gamified learning is a well-established pedagogy internationally (orienteering-style education, museum trails, city-history walks, team-building), but North Macedonia and the wider Western Balkans have no dominant localized platform for it. International tools (Actionbound, Goosechase) are English-first, priced for Western Europe, and not aligned with the Macedonian БРО curriculum.

**The ask (combined, Alibaba-selectable):**
1. **Cloud infrastructure support** — Alibaba Cloud credits / sponsored infrastructure to run a staged regional migration proof of concept alongside the current Firebase/Vercel production stack.
2. **Direct seed investment** — €25,000–€75,000 to fund the remaining institutional-SaaS work (recurring billing, onboarding, regional localisation) and school-pilot rollout.
3. **Strategic partnership** — evaluation of Alibaba Cloud AI (Qwen / Model Studio) as a second AI-generation provider alongside Google Gemini, and introductions to regional education-sector contacts.

---

## 2. Problem & Market

### 2.1 The problem

- Macedonian schools have strong appetite for outdoor, experiential and project-based learning (orienteering clubs, city-history classes, science field trips, team-building days) but no affordable, native-language digital tool to run and assess it.
- International "adventure"/location-based learning tools (Actionbound and similar) are English-first, priced in EUR/USD for Western markets, and have no concept of the Macedonian curriculum, grading conventions or local payment rails.
- Institutional buyers (schools, БРО, municipalities) need Macedonian-language support, local invoicing, and curriculum-aligned reporting — none of which global tools provide.

### 2.2 Target market

| Segment | Description | Willingness to pay |
|---|---|---|
| **K-12 teachers** | ~20,000 in North Macedonia across all subjects, not just STEM | Low (freemium → Starter/Pro) |
| **Schools & municipalities** | Orientation days, city-history programmes, science weeks | Medium–High (institutional plan) |
| **Corporate / team-building** | Onboarding, offsites, city-based team challenges | Medium |
| **Museums & cultural institutions** | Self-guided or guided visitor trails | Medium |

### 2.3 Competitive positioning

| Feature | Avantura MKD Pro | Actionbound | Goosechase |
|---|---|---|---|
| Native Macedonian language | ✅ | ❌ | ❌ |
| БРО curriculum-aligned objective mapping | ✅ | ❌ | ❌ |
| 9 stage types incl. conditional branching (SWITCH) | ✅ | Partial | Partial |
| Stable per-student identity + immutable attempts | ✅ | ❌ (not published) | ❌ (not published) |
| Objective-level mastery reporting | ✅ | ❌ | ❌ |
| Offline play + sync queue | ✅ | Partial | Partial |
| Free tier | ✅ | Limited | Limited |

---

## 3. Product Overview

### 3.1 Core capabilities (all live in production)

- **9 stage types:** Info, Quiz (free-text/multiple-choice/matching/ordering), Mission (photo/video/audio/rubric-graded submission), GPS Find-Spot, QR Scan, QR Task, Survey, Tournament (team judging), and SWITCH (conditional branching between stages).
- **Adventure authoring:** drag-and-drop stage editor, GPX/KML route import, rich-text editor with KaTeX math formulas, inventory items players collect/require, auto-save.
- **Gameplay:** fixed, selectable or random stage sequencing; live GPS map; QR scanning; offline caching of a quest with a queued-submission sync when connectivity returns.
- **Live sessions:** real-time hosted sessions with join codes, live leaderboard, SOS/help signalling, broadcast/free modes.
- **Analytics:** leaderboard, funnel/drop-off analysis, per-question QUIZ accuracy with distractor breakdown, cross-quest "weakest questions" view, rubric grading queue, CSV/Excel export.
- **Class management:** roster-based class groups, stable per-student result identity (not just name matching), gradebook across assigned adventures, PDF certificates, individual roster launch links.
- **Curriculum objectives:** teachers define stable learning objectives per adventure, map any stage to one, see live curriculum-coverage summaries, and export a per-student objective-mastery CSV report.
- **AI-assisted authoring:** Google Gemini generates a full draft adventure (stages, questions, GPS points) from a text prompt.
- **Payments:** Free / Starter (590 MKD ≈ €9.6/mo) / Pro (1,490 MKD ≈ €24/mo) / Enterprise (custom) plans; bank transfer and PayPal are live today, with Stripe server endpoints already implemented for future self-service billing.
- **Legal:** Macedonian/English localisation, privacy policy and terms routes.

### 3.2 Engineering maturity (verified 23 July 2026)

Avantura has been through a sustained, phase-by-phase hardening programme — unusual rigor for a solo-founder product at this stage:

| Phase | What it delivered |
|---|---|
| Design-system migration | Every raw interactive control and card surface migrated to shared, semantically-consistent `Button`/`Card` primitives across the entire application — zero raw controls remaining outside the primitives themselves |
| Stable student identity | Optional, bounded `studentId` on results, resolved ID-first with legacy name-fallback — duplicate names in a class no longer misattribute results |
| Idempotent attempts | Client-generated `attemptId`, immutable attempt records, and a selectable resolution policy (first / latest / best / teacher-approved) for gradebooks and certificates |
| Teacher approval workflow | Owner-only, field-scoped Firestore rule for approving/revoking individual attempts, surfaced in the results dashboard |
| Curriculum objective model | Stable, renameable learning-objective references on any stage; pure coverage-aggregation and per-student mastery functions; Creator UI for mapping and a live coverage summary; CSV mastery export in class management |
| Privacy/authorization audit | Explicit review confirming every new field introduced by the above rides on already owner-gated Firestore documents, with no new read surface requiring new rules |

This is not marketing framing — it is the literal sequence of engineering batches executed and evidenced (commit hashes, test counts, browser QA) in the project's own hardening execution ledger.

### 3.3 Product maturity scores

| Category | Status |
|---|---|
| Automated test suite | 656 tests across 78 Vitest files, all passing |
| TypeScript | Strict mode, zero compilation errors |
| E2E coverage | Playwright — public shell, legal routes, authenticated dashboard/creator/results surfaces |
| Mobile | Expo/React Native app, package `net.mismath.avantura`, AAB build ready |
| i18n | Macedonian (primary) + English, translation-parity test enforced in CI |

> **Honest framing:** Avantura MKD Pro is an **early-stage, solo-founder product with unusually strong engineering foundations**, currently in limited pilot use with Macedonian teachers. Verified registered-user and school-adoption counts will be added once pulled from production analytics rather than estimated here.

---

## 4. Technical Architecture

### 4.1 Stack overview

```
┌───────────────────────────────────────────────────────────────┐
│  FRONTEND                                                       │
│  React 19 + Vite (PWA) · TailwindCSS · Expo/React Native mobile │
│  Shared TypeScript domain model (packages/shared)               │
└───────────────┬─────────────────────────────┬───────────────────┘
                │ HTTPS                        │ HTTPS
┌───────────────▼──────────────┐  ┌────────────▼────────────────┐
│  FIREBASE                     │  │  VERCEL                      │
│  Auth (Google + email/pass)   │  │  Serverless API endpoints    │
│  Firestore (owner-gated rules)│  │  Static hosting + edge CDN   │
│  Storage (media)              │  │                              │
└───────────────┬──────────────┘  └────────────┬────────────────┘
                │                               │
        ┌───────▼───────────────────────────────▼────────┐
        │  GOOGLE GEMINI API                              │
        │  Server-side AI adventure generation             │
        └──────────────────────────────────────────────────┘
```

### 4.2 Key technical decisions

- **Shared domain model:** `packages/shared` is a single TypeScript source of truth for quest/stage/result/objective types and pure business logic (coverage, mastery, gradebook, attempt-selection), consumed identically by the web app, the mobile app, and the test suite — no duplicated logic between platforms.
- **Firestore security model:** owner/collaborator-gated quest documents, per-document `ownsQuest()` checks on results reads, field-scoped update rules for grading and approval (a grading update may only touch `grades`/`points`; an approval update may only touch `approvedAt`/`approvedBy` and must bind the approver to the authenticated UID). Verified to compile cleanly against current Firebase tooling.
- **Offline-first mobile/PWA play:** a quest can be cached locally, played fully offline, and results are queued and synced with in-flight deduplication when connectivity returns.
- **AI layer:** Google Gemini generates full adventure drafts server-side; API keys are never exposed to the client.
- **Testing discipline:** 656 Vitest tests plus a dedicated Playwright browser-QA harness with a mocked authenticated context (no production auth bypass), used to visually verify every UI change across desktop/mobile and light/dark themes before merge.

### 4.3 Data model overview

Principal entities: `Quest` (with `stages[]` and optional `pedagogy.learningObjectives[]`), `QuestResult` (with optional `studentId`/`attemptId`/`approvedAt`/`approvedBy`), `ClassGroup`/`GroupStudent`, `LearningObjective`, templates, payment requests, and live game sessions. All cross-client contracts are Zod-validated shared TypeScript types.

---

## 5. Traction & Metrics

### 5.1 Verified engineering data (23 July 2026)

| Metric | Value |
|---|---|
| Automated tests | 656 (78 files), all passing |
| Stage types | 9 |
| Curated pedagogical templates | 15, across 7 subjects (Math, Natural Sciences, History, Language, Art, PE, Other) |
| Mobile package | `net.mismath.avantura`, AAB build ready |
| Languages | Macedonian (primary), English |

### 5.2 Adoption

Avantura is in limited pilot use with Macedonian teachers. Concrete registered-user, session and completion counts must be pulled from production analytics before external submission — they are deliberately not estimated in this document.

---

## 6. Business Model

### 6.1 Pricing (live)

| Plan | Price | Includes |
|---|---|---|
| **Free** | 0 MKD | Core authoring and play, limited adventures |
| **Starter** | 590 MKD / month (≈ €9.6) | Higher adventure limits, more features |
| **Pro** | 1,490 MKD / month (≈ €24) | Full feature set incl. live sessions, analytics, AI generation |
| **Enterprise** | Custom | Institutional/school licensing (by inquiry) |

Billing is currently manual (bank transfer, PayPal) with an admin approval workflow; Stripe server endpoints exist in the codebase for future self-service billing but are not yet wired into a recurring lifecycle (trial, renewal, dunning) — this is explicitly tracked as remaining work.

### 6.2 Revenue streams

1. Individual teacher Starter/Pro subscriptions.
2. School/institutional licensing (highest value, not yet formalised as a repeatable process).
3. Future: curriculum/template marketplace, municipal/tourism trail licensing (the platform is equally usable for city-history or museum trails, not only classroom use).

---

## 7. Financial Plan

> **Figures below are planning assumptions, not quotations or audited accounts**, presented at the same level of rigor as the sibling `mismath.net` proposals.

### 7.1 Current operating cost (lean, monthly)

| Item | Cost |
|---|---|
| Firebase (Auth + Firestore + Storage) | ≈ €20–50 |
| Vercel | ≈ €20 |
| Google Gemini API | ≈ €10–30 |
| Expo Application Services (mobile builds) | ≈ €0–30 |
| Domain + email | ≈ €5 |
| **Total** | **≈ €55–135 / month** |

### 7.2 Use of funds (on a €50,000 raise)

| Allocation | Amount | Purpose |
|---|---:|---|
| Recurring billing & institutional SaaS completeness | €15,000 | Trial/renewal/cancellation lifecycle, onboarding sequence, institutional documentation |
| School pilots & teacher training | €10,000 | Training, travel, support materials, БРО engagement |
| Objective mastery & reporting expansion | €8,000 | Student/parent-facing reports, richer analytics |
| Cloud infrastructure (scale-out) | €7,000 | Alibaba Cloud pilot workstream (see Section 8, Option A) |
| Security, privacy & operational-readiness audit | €5,000 | Independent review, backup/restore drills, monitoring |
| Marketing & school outreach | €3,500 | БРО/МОН engagement, case studies, conferences |
| Contingency | €1,500 | — |

### 7.3 Revenue projection (illustrative)

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Starter/Pro subscribers | 80 | 400 | 1,500 |
| Subscription revenue (blended ≈ €15/mo avg) | €6,000 | €30,000 | €110,000 |
| Institutional licenses | 5 | 30 | 100 |
| Institutional revenue (€400 avg) | €2,000 | €12,000 | €40,000 |
| **Total ARR** | **€8,000** | **€42,000** | **€150,000** |

**Assumptions:** freemium → paid conversion ~4–6%; institutional adoption driven by БРО/МОН engagement and direct school outreach; Year 2–3 growth assumes completion of recurring billing and at least one regional (non-Macedonian) localisation.

---

## 8. The Ask — Alibaba Cloud (Combined Proposal)

We propose a **flexible, tiered partnership** — Alibaba Cloud may choose any combination:

### Option A — Cloud Infrastructure Support (credits / sponsored infrastructure)

A staged, non-destructive proof of concept alongside the current Firebase/Vercel production stack:

- **ECS / Function Compute** for a parallel serverless API pilot.
- **OSS + CDN** for static delivery and media storage evaluation.
- **A managed database pilot** (e.g. ApsaraDB) evaluated against current Firestore usage patterns.
- **Model Studio / Qwen credits** to evaluate a second AI-generation provider alongside Google Gemini.

No student production data would enter the pilot until data region, retention and consent requirements are confirmed. Indicative ask: **USD 10,000–20,000 in credits over 12 months**, exact scope to be calibrated to the applicable programme tier.

### Option B — Direct Seed Investment

**€25,000–€75,000** to execute the Section 7.2 use-of-funds plan, in exchange for equity (terms negotiable). Investment thesis: a technically mature, low-burn platform with a genuinely differentiated engineering foundation (stable identity, objective mastery, extensive automated verification) still at an early revenue stage, serving an underserved regional curriculum niche.

### Option C — Strategic Partnership

- **AI integration:** evaluate Alibaba Cloud Qwen / Model Studio as a second adventure-generation provider alongside Google Gemini, reducing vendor concentration.
- **Regional introductions:** support connecting with Balkan education-ministry and school-network contacts.
- **Reference deployment:** Avantura as a localized, curriculum-aligned edtech reference customer for Alibaba Cloud in Southeast Europe, alongside the other `mismath.net` products (see the portfolio overview).

---

## 9. Roadmap (next 12 months)

**Institutional SaaS completeness (current focus):**
- Recurring billing lifecycle (trial, renewal, cancellation, dunning).
- Onboarding email sequence.
- Institutional renewal/admin documentation.
- Production monitoring, alerting, backup/restore and incident runbooks.

**Curriculum & reporting:**
- Student/parent-facing objective-mastery reports (teacher-facing CSV export already live).
- Curriculum-coverage teacher dashboard beyond the single-quest view.

**Growth:**
- БРО/МОН engagement for institutional endorsement.
- Regional localisation beyond Macedonian/English, informed by school demand.

---

## 10. Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Solo-founder key-person risk | Extensive automated test suite (656 tests), documented hardening ledger, shared-package architecture usable across web/mobile |
| Credits expire before productive use | Staged, evidence-gated consumption plan; no commitment to a full migration up front |
| Migration creates vendor lock-in | Portable TypeScript services; current Firebase/Vercel stack remains authoritative during any pilot |
| Slow institutional sales cycle | Freemium bottom-up adoption plus direct БРО/school outreach |
| Small domestic market | Platform is subject-agnostic and usable for municipal/tourism trails, not only classroom curricula |
| Personal/student data exposure | Firestore rules independently audited (Section 3.2); pilot uses non-production data only |

---

## 11. Team

**Igor Bogdanoski** — Founder, math teacher & full-stack engineer. Sole developer of Avantura MKD Pro and three companion `mismath.net` products (MathDigitizer, MisMath AI, MKD Slidea) — see the portfolio overview for the combined picture. Contact: bogdanoskiigor@gmail.com.

---

## 12. Appendix

### 12.1 Live URLs

- Production: https://avantura.mismath.net
- Repository: https://github.com/igorbogdanoski/ActionBountMKD-Pro

### 12.2 Technology index

React 19 · TypeScript · Vite (PWA) · Expo / React Native · Firebase (Auth, Firestore, Storage) · Vercel (hosting + serverless functions) · Google Gemini API · Vitest (656 tests) · Playwright (E2E) · Zod (schema validation).

### 12.3 Information still required before formal submission

- Verified registered-user, session and school-adoption counts from production analytics.
- Confirmed Alibaba Cloud programme name, eligibility, region and credit validity.
- Current cloud invoices for a submission-ready cost baseline.
- Legal entity/registration details for the applicant.

---

*This document combines technical documentation and a financial/investment proposal, in the same format as the companion proposals for MathDigitizer Pro, MisMath AI and MKD Slidea. Financial projections (Section 7) are illustrative and assumption-based. Prepared July 2026.*
