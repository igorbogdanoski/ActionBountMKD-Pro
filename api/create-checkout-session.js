import Stripe from 'stripe';

// Lazy — constructing Stripe with a missing/invalid key throws immediately,
// which would crash the whole module (and every request to this function)
// at import time if STRIPE_SECRET_KEY isn't configured.
let stripe;
function getStripe() {
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

const PRICE_MAP = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro:     process.env.STRIPE_PRICE_PRO,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: 'Плаќањето преку картичка не е конфигурирано.' });
    return;
  }

  const { planId, userId, userEmail } = req.body;

  if (!planId || !userId || !userEmail) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const priceId = PRICE_MAP[planId];
  if (!priceId) {
    res.status(400).json({ error: `Unknown plan: ${planId}` });
    return;
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      metadata: { userId, planId },
      success_url: `${process.env.APP_URL}/dashboard?checkout=success`,
      cancel_url:  `${process.env.APP_URL}/pricing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
}
