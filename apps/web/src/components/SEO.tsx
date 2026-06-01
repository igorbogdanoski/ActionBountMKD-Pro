import { Helmet } from 'react-helmet-async';

const APP_NAME = 'АвантураКреатор';
const APP_URL = import.meta.env.VITE_APP_URL || 'https://avantura.mismath.net';
const DEFAULT_IMAGE = `${APP_URL}/og-image.png`;

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

export function SEO({
  title,
  description = 'Создавај и играј интерактивни GPS авантури и едукативни квестови. Македонска платформа за интерактивно учење на отворено.',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} — ${APP_NAME}` : `${APP_NAME} | Интерактивни GPS Авантури`;
  const canonicalUrl = url ? `${APP_URL}${url}` : APP_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* OpenGraph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={APP_NAME} />
      <meta property="og:locale" content="mk_MK" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}

// ─── Structured data helpers ────────────────────────────────────────────────

export function SoftwareAppSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_NAME,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web, Android, iOS',
    url: APP_URL,
    description: 'Платформа за создавање и играње интерактивни GPS авантури, едукативни квестови и лов на богатство.',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'MKD',
      lowPrice: '0',
      offerCount: '4',
    },
    inLanguage: ['mk', 'en'],
    author: {
      '@type': 'Organization',
      name: 'АвантураКреатор',
      url: APP_URL,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
