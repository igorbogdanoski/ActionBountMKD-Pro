# Draft reply to Shirley Ma (Alibaba Cloud)

> **Note before sending — link readiness check (23 July 2026):**
>
> - ✅ `math.mismath.net` doc link works now — `FINANCIAL_PLAN_ALIBABA.md` is committed and pushed to `origin/main` on GitHub.
> - ✅ `slidea.mismath.net` doc link works now — `ALIBABA_CLOUD_PROPOSAL.md` is committed and pushed to `origin/main`.
> - ⚠️ `ai.mismath.net` doc link **will 404 right now** — `DONOR_CLOUD_CREDITS.md` exists locally but that repo's `main` is 9 commits ahead of `origin/main` (unpushed), and it also has unrelated uncommitted changes (`firestore.rules`, `services/firestoreService.exam.ts`) that I have not touched. You'll need to push that repo yourself (or tell me to, once you confirm those pending changes are safe to push).
> - ⚠️ Avantura's own docs (this folder) **are not committed or pushed yet** — still untracked in this repo. I can commit and push them for you on your confirmation; until then, the Avantura doc links below will also 404.
>
> Everything else in this draft is ready. Fix the two ⚠️ items (or ask me to handle the Avantura one) before you actually send this.

---

**Subject:** Re: Great connecting — here's the mismath.net portfolio

Hi Shirley,

Great to hear from you, and thank you for the kind words!

The short version: I'm a math teacher in North Macedonia who also builds software, and over the past year I've built four separate, live EdTech platforms under the mismath.net domain — each solving a gap in Macedonian education that no international vendor localizes for:

- **Avantura MKD Pro** — [avantura.mismath.net](https://avantura.mismath.net) — GPS-based outdoor "adventure" learning (students complete real-world checkpoints, QR stations, quizzes and missions instead of a static lesson)
- **MathDigitizer Pro** — [math.mismath.net](https://math.mismath.net) — turns handwritten notes, PDFs and textbook photos into curriculum-aligned digital math content, with AI grading and differentiation
- **MisMath AI** — [ai.mismath.net](https://ai.mismath.net) — an AI copilot for math teachers with real retrieval-based search over the national curriculum, in Macedonian/Albanian/Turkish/English
- **MKD Slidea** — [slidea.mismath.net](https://slidea.mismath.net) — a live interactive presentation and audience-response tool, a localized alternative to Mentimeter/Kahoot!/Slido

On the technical side: all four are React/TypeScript, mostly on Firebase/Vercel, all use Google Gemini for AI generation today, and all four have their own automated test suites (thousands of tests combined) and CI pipelines — these aren't prototypes, they're in real production use with real Macedonian teachers and students.

I've put together the full documentation for each — technical architecture, traction, and a financial/cloud-credit proposal — all open on GitHub if you want to go deeper:

- **Avantura MKD Pro:** [portfolio overview](https://github.com/igorbogdanoski/ActionBountMKD-Pro/blob/main/docs/alibaba-cloud-application/MISMATH_PORTFOLIO_OVERVIEW.md) · [full proposal](https://github.com/igorbogdanoski/ActionBountMKD-Pro/blob/main/docs/alibaba-cloud-application/ALIBABA_CLOUD_GRANT_AND_FINANCIAL_PLAN.md) · [repo](https://github.com/igorbogdanoski/ActionBountMKD-Pro)
- **MathDigitizer Pro:** [full proposal](https://github.com/igorbogdanoski/MathDigitizer/blob/main/docs/FINANCIAL_PLAN_ALIBABA.md) · [repo](https://github.com/igorbogdanoski/MathDigitizer)
- **MisMath AI:** [cloud credits proposal](https://github.com/igorbogdanoski/math-curriculum-ai-navigator/blob/main/docs/DONOR_CLOUD_CREDITS.md) · [repo](https://github.com/igorbogdanoski/math-curriculum-ai-navigator)
- **MKD Slidea:** [full proposal](https://github.com/igorbogdanoski/mkd-slidea/blob/main/ALIBABA_CLOUD_PROPOSAL.md) · [repo](https://github.com/igorbogdanoski/mkd-slidea)

The short version of what I'm hoping Alibaba Cloud could help with, across the four:

1. **Cloud credits / sponsored infrastructure** — all four run AI inference at scale (Google Gemini today), and that's our shared primary scaling cost as usage grows.
2. **A technical evaluation of Alibaba Cloud Model Studio (Qwen)** as a second AI provider — the architecture on all four is already provider-agnostic, so this is a real, not theoretical, fit.
3. **Direct investment** to fund the next 12 months of roadmap across the products (figures vary per product — full breakdown in each linked document).
4. **Any partnership / go-to-market support** in the education sector that makes sense on your end.

Happy to jump on a call to walk through any of this, whenever suits you — no pressure to read all four documents cover to cover first.

Looking forward to hearing from you.

Best,
Igor Bogdanoski
bogdanoskiigor@gmail.com
