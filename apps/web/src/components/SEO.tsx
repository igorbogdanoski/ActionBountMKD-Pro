import { Helmet } from 'react-helmet-async';

const APP_NAME = 'Авантура';
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
      name: APP_NAME,
      url: APP_URL,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export function PricingSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Авантура МКД',
    url: APP_URL,
    applicationCategory: 'EducationalApplication',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'MKD',
        description: 'До 3 авантури, до 30 играчи',
      },
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '590',
        priceCurrency: 'MKD',
        description: 'До 20 авантури, до 100 играчи, AI генератор',
        billingIncrement: 'P1M',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '1490',
        priceCurrency: 'MKD',
        description: 'Неограничени авантури, до 500 играчи, live сесии',
        billingIncrement: 'P1M',
      },
      {
        '@type': 'Offer',
        name: 'Enterprise',
        description: 'Поединечна цена за општини, општини и МОН',
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

interface LearningResourceSchemaProps {
  title: string;
  description: string;
  url: string;
  subject?: string;
  grade?: string;
}

export function LearningResourceSchema({ title, description, url, subject, grade }: LearningResourceSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: title,
    description,
    url: `${APP_URL}${url}`,
    learningResourceType: 'Interactive Activity',
    ...(subject ? { about: subject } : {}),
    ...(grade ? { educationalLevel: grade } : {}),
    isAccessibleForFree: true,
    inLanguage: 'mk',
    provider: { '@type': 'Organization', name: APP_NAME, url: APP_URL },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: `${APP_URL}${item.url}` } : {}),
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

interface FaqSchemaItem {
  q: string;
  a: string;
}

export function FaqSchema({ items }: { items: FaqSchemaItem[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
