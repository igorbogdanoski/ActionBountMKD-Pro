import type { IncomingMessage, ServerResponse } from 'node:http';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildSitemapXml, STATIC_ROUTES } from '../apps/web/scripts/gen-sitemap.mjs';

// Regenerated on every request (cached at the edge, see Cache-Control below)
// rather than once at build time — the previous static sitemap.xml never
// updated between deploys and had zero public-quest URLs in it at all, so
// the platform's largest source of unique content (every public quest) was
// invisible to Google. vercel.json rewrites /sitemap.xml here.
interface VercelRequest extends IncomingMessage {}
interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  send(body: string): void;
}

function adminApp() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)) });
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');

  try {
    adminApp();
    // Single equality filter only — avoids requiring a composite Firestore
    // index (where + orderBy on different fields needs one to be created
    // manually, which this environment can't reliably deploy for itself).
    const snap = await getFirestore()
      .collection('quests')
      .where('visibility', '==', 'public')
      .limit(5000)
      .get();

    const questRoutes = snap.docs.map(d => ({ path: `/play/${d.id}`, changefreq: 'weekly' as const, priority: '0.6' }));
    res.status(200).send(buildSitemapXml([...STATIC_ROUTES, ...questRoutes]));
  } catch (err) {
    console.error('sitemap error:', err);
    // Soft-fail to the static route list rather than a 500 — a sitemap
    // missing dynamic quest URLs is far better than search engines seeing
    // an error page at this URL.
    res.status(200).send(buildSitemapXml(STATIC_ROUTES));
  }
}
