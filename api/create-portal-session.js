import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Lazy — constructing Stripe with a missing/invalid key throws immediately,
// which would crash the whole module (and every request to this function)
// at import time if STRIPE_SECRET_KEY isn't configured.
let stripe;
function getStripe() {
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

function adminDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: 'Плаќањето преку картичка не е конфигурирано.' });
    return;
  }

  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  try {
    const profileSnap = await adminDb().collection('user_profiles').doc(userId).get();
    const profile = profileSnap.data();

    if (!profile?.subscriptionId) {
      res.status(400).json({ error: 'No active subscription found' });
      return;
    }

    const subscription = await getStripe().subscriptions.retrieve(profile.subscriptionId);
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${process.env.APP_URL}/dashboard`,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('Portal session error:', err);
    res.status(500).json({ error: err.message });
  }
}
