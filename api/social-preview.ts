import type { IncomingMessage, ServerResponse } from 'node:http';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Social-share crawlers (Facebook/WhatsApp/Viber/...) and search bots don't
// execute JS — they only ever see index.html's generic, site-wide meta tags,
// so every shared quest link previewed identically regardless of which quest
// it was. This endpoint is rewritten to (see vercel.json's `has` user-agent
// match) only for those bot user-agents, and returns a tiny static HTML
// document with the specific quest's title/description/image — real browsers
// never hit this path, they get the normal SPA.
const SITE_ORIGIN = 'https://avantura.mismath.net';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
}
interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  send(body: string): void;
}

function adminApp() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)) });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/\n/g, ' ');
}

function renderHtml(opts: {
  title: string;
  description: string;
  image: string;
  canonicalUrl: string;
  jsonLd?: Record<string, unknown>;
}): string {
  const { title, description, image, canonicalUrl, jsonLd } = opts;
  return `<!doctype html>
<html lang="mk">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}" />
<link rel="canonical" href="${escapeAttr(canonicalUrl)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeAttr(title)}" />
<meta property="og:description" content="${escapeAttr(description)}" />
<meta property="og:image" content="${escapeAttr(image)}" />
<meta property="og:url" content="${escapeAttr(canonicalUrl)}" />
<meta property="og:site_name" content="Авантура" />
<meta property="og:locale" content="mk_MK" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeAttr(title)}" />
<meta name="twitter:description" content="${escapeAttr(description)}" />
<meta name="twitter:image" content="${escapeAttr(image)}" />
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<meta http-equiv="refresh" content="0; url=${escapeAttr(canonicalUrl)}" />
</head>
<body>
<p><a href="${escapeAttr(canonicalUrl)}">${escapeHtml(title)}</a></p>
<p>${escapeHtml(description)}</p>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const type = String(req.query?.type ?? '');
  const id = String(req.query?.id ?? '');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');

  const fallback = () => renderHtml({
    title: 'Авантура | Интерактивни GPS Авантури',
    description: 'Создавај и играј интерактивни GPS авантури и едукативни квестови. Македонска платформа за интерактивно учење на отворено.',
    image: `${SITE_ORIGIN}/og-image.png`,
    canonicalUrl: SITE_ORIGIN,
  });

  if (!id || (type !== 'play' && type !== 'leaderboard')) {
    res.status(200).send(fallback());
    return;
  }

  try {
    adminApp();
    const snap = await getFirestore().collection('quests').doc(id).get();
    const quest = snap.exists ? (snap.data() as any) : null;

    // Respect the same visibility the Firestore rules would — the Admin SDK
    // bypasses security rules, so a secret quest's real title/description
    // must never leak into a publicly-cacheable crawler preview.
    const isPublic = quest && (quest.visibility === 'public' || quest.isPublic === true);
    if (!quest || !isPublic) {
      res.status(200).send(fallback());
      return;
    }

    const title = String(quest.title ?? 'Авантура').slice(0, 200);
    const description = String(quest.description ?? '').slice(0, 300) || 'Интерактивна GPS авантура на платформата Авантура.';
    const image = quest.coverImage ? String(quest.coverImage) : `${SITE_ORIGIN}/og-image.png`;

    if (type === 'leaderboard') {
      const canonicalUrl = `${SITE_ORIGIN}/leaderboard/${id}`;
      res.status(200).send(renderHtml({
        title: `${title} — Јавна табела`,
        description: `Јавна табела со резултати за „${title}".`,
        image,
        canonicalUrl,
      }));
      return;
    }

    const canonicalUrl = `${SITE_ORIGIN}/play/${id}`;
    const pedagogy = quest.pedagogy ?? {};
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: title,
      description,
      url: canonicalUrl,
      learningResourceType: 'Interactive Activity',
      ...(pedagogy.subject ? { about: pedagogy.subject } : {}),
      ...(pedagogy.grade ? { educationalLevel: pedagogy.grade } : {}),
      isAccessibleForFree: true,
      inLanguage: 'mk',
      provider: { '@type': 'Organization', name: 'Авантура', url: SITE_ORIGIN },
    };

    res.status(200).send(renderHtml({ title, description, image, canonicalUrl, jsonLd }));
  } catch (err) {
    console.error('social-preview error:', err);
    res.status(200).send(fallback());
  }
}
