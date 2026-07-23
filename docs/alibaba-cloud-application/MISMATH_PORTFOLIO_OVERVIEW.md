# The mismath.net Portfolio — Introduction & Combined Alibaba Cloud Proposal

**Prepared for:** Alibaba Cloud
**Founder:** Igor Bogdanoski — mathematics teacher and solo full-stack engineer, Prilep / Skopje, North Macedonia
**Date:** July 2026
**Document version:** 1.0

> This document introduces four independent, production-grade EdTech products built by one founder over the past year, and presents a single combined Alibaba Cloud proposal covering all four. Each product also has its own detailed technical/financial document — linked in Section 6 — for anyone who wants to go deeper on a specific one.

---

## 1. The story

I'm a math teacher in North Macedonia who also builds software. Over the past year I built four separate, live, production-grade EdTech platforms under the `mismath.net` domain, each solving a different gap in Macedonian education that no international vendor addresses — because none of them localize for the Macedonian (or wider Balkan/Albanian/Turkish) curriculum, language, or payment infrastructure:

| Product | Domain | What it does |
|---|---|---|
| **MathDigitizer Pro** | math.mismath.net | Turns handwritten notes, PDFs, textbook photos and video into curriculum-aligned digital math content, with AI grading, differentiation and an early-warning system for struggling students |
| **MisMath AI** | ai.mismath.net | An AI copilot for math teachers with real RAG search over the national curriculum — lesson plans, tests, grading and interactive illustrations, in Macedonian, Albanian, Turkish and English |
| **MKD Slidea** | slidea.mismath.net | A live interactive presentation and audience-response tool (a localized alternative to Mentimeter/Kahoot!/Slido) — real-time polls, quizzes, word clouds and Q&A that students join from any phone with just a code |
| **Avantura MKD Pro** | avantura.mismath.net | GPS-based outdoor learning adventures — students complete real-world checkpoints, QR stations, quizzes and missions instead of a static lesson |

Each one is independently live, independently tested, and independently documented. Together they represent a genuine, if unusual, engineering output for a single solo founder: real production traffic, thousands of automated tests across the four codebases, and a shared conviction that Macedonian (and regional) students and teachers deserve the same quality of tooling as Western Europe gets by default.

## 2. Why one founder built four products, not one

Each product targets a different moment in a teacher's actual workflow, and each grew out of a real, specific problem I hit as a teacher myself:

- **MathDigitizer Pro** — I was manually re-typing test questions from old PDFs and photographed notes every week; the platform automates that and adds pedagogy on top (Bloom's taxonomy, differentiation, curriculum alignment).
- **MisMath AI** — teachers need a conversational assistant that actually knows the Macedonian curriculum, not a generic chatbot; it's built around real retrieval over curriculum documents, not just a prompt wrapper.
- **MKD Slidea** — classroom engagement tools (Mentimeter, Kahoot!) are priced and localized for Western Europe; Macedonian teachers had nothing native.
- **Avantura MKD Pro** — outdoor, project-based, location-driven learning had no local platform at all — teachers were building GPS scavenger hunts by hand with paper maps and QR codes printed at the local copy shop.

They share infrastructure patterns (Firebase/Vercel, Google Gemini, React/TypeScript, extensive automated testing) but are separate codebases, separate user bases, and separate businesses — not one product marketed four ways.

## 3. Portfolio snapshot (verified, July 2026)

| Product | Automated tests | Notable traction | Primary language(s) |
|---|---:|---|---|
| MathDigitizer Pro | 109 | B2B school-inquiry pipeline active | MK / SQ / EN |
| MisMath AI | 3,081 | 250+ registered teachers | MK / SQ / TR / EN |
| MKD Slidea | — (Playwright E2E across all 8 activity types) | 102 registered users, 138+ events, 300 concurrent participants load-tested | MK (regional locales architected) |
| Avantura MKD Pro | 656 | Limited pilot use; strongest engineering-hardening track record of the four | MK / EN |

None of the four is a prototype. All four are live, deployed, and have their own automated test suite, CI pipeline and (where applicable) production error monitoring.

## 4. The common technical thread: AI inference cost and Alibaba Cloud

Three of the four products (MathDigitizer, MisMath AI, Slidea) currently run entirely on **Google Gemini** for AI generation/grading/RAG, and all three have independently identified **AI inference cost as the primary scaling constraint** as usage grows — and all three have independently flagged **Alibaba Cloud Model Studio / Qwen** as a natural second provider, because each product's AI layer is already built as a model-agnostic, server-side proxy rather than a hard-coded Gemini integration.

This is not a coincidence created for this proposal — it is a real, shared architectural fact across the portfolio, and it is the reason a **combined** conversation with Alibaba Cloud is more efficient than four separate ones: a single technical evaluation of Qwen/Model Studio against Gemini, done once, would directly inform migration decisions across all four products at once.

## 5. Combined ask (portfolio-level)

Each product's own document (linked below) contains its full, independently-reasoned ask. Summarized:

| Product | Cloud credits ask | Investment ask | Partnership interest |
|---|---|---|---|
| MathDigitizer Pro | Infrastructure credits (amount TBD with Alibaba) | €50,000–65,000 | AliCloud, DingTalk Education, DAMO Academy, mentorship |
| MisMath AI | **$50,000** over 12 months (inference, vector search, compute/CDN, observability) | — (credits-focused ask) | Model Studio/Qwen adoption, co-marketing |
| MKD Slidea | Credits/sponsored infrastructure (HA Postgres, Redis, OSS, CDN) | €25,000–100,000 | Qwen integration, Alibaba Cloud Marketplace listing, joint go-to-market |
| Avantura MKD Pro | USD 10,000–20,000 over 12 months | €25,000–75,000 | Qwen evaluation, regional education-sector introductions |

**Combined indicative range: USD/EUR 100,000–250,000+ across credits and investment, depending on which products and options Alibaba chooses to engage with.** This is presented as a menu, not a single indivisible request — Alibaba may support one product, several, or the whole portfolio, and may choose credits only, investment only, or both.

**What all four proposals converge on, regardless of scale chosen:**
1. Cloud credits / sponsored infrastructure to de-risk the AI-inference cost curve as usage grows.
2. A technical evaluation of Alibaba Cloud Model Studio (Qwen) as a second AI provider across the portfolio.
3. Introductions and go-to-market support in the education sector, regionally and beyond.

## 6. Individual product documents

- **MathDigitizer Pro** — `math.mismath.net` — full proposal: `FINANCIAL_PLAN_ALIBABA.md` (in the MathDigitizer repository).
- **MisMath AI** — `ai.mismath.net` — full proposal: `DONOR_CLOUD_CREDITS.md` and `DONOR_FINANCIAL_PLAN.md` (in the math-curriculum-ai-navigator repository).
- **MKD Slidea** — `slidea.mismath.net` — full proposal: `ALIBABA_CLOUD_PROPOSAL.md` (in the mkd-slidea repository).
- **Avantura MKD Pro** — `avantura.mismath.net` — full proposal: [`ALIBABA_CLOUD_GRANT_AND_FINANCIAL_PLAN.md`](ALIBABA_CLOUD_GRANT_AND_FINANCIAL_PLAN.md) (this folder), plus [`TECHNICAL_DOCUMENTATION.md`](TECHNICAL_DOCUMENTATION.md) and [`USER_GUIDE.md`](USER_GUIDE.md).

## 7. Honest framing

This is a solo-founder portfolio at an early revenue stage across all four products. The engineering maturity (automated test coverage, CI, documented hardening work, security-rule audits) is unusually strong for this stage; commercial traction is real but early, and is presented honestly per-product rather than inflated. Financial figures throughout are planning assumptions, not quotations or audited accounts, and the exact Alibaba Cloud programme, eligibility and credit terms need to be confirmed directly with Alibaba before any formal submission.

## 8. Contact

**Igor Bogdanoski**
bogdanoskiigor@gmail.com

---

*This overview ties together four independently-prepared product documents. Prepared July 2026.*
