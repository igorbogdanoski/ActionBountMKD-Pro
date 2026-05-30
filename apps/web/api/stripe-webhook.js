import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function adminDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return getFirestore();
}

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

const PLAN_TRANSITIONS = {
  'checkout.session.completed':    handleCheckoutCompleted,
  'customer.subscription.deleted': handleSubscriptionDeleted,
};

async function handleCheckoutCompleted(event) {
  const session = event.data.object;
  const { userId, planId } = session.metadata ?? {};
  if (!userId || !planId) return;

  await adminDb().collection('user_profiles').doc(userId).set({
    plan: planId,
    subscriptionId: session.subscription ?? null,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

async function handleSubscriptionDeleted(event) {
  const sub = event.data.object;
  // Find user by subscriptionId and downgrade to free
  const snap = await adminDb()
    .collection('user_profiles')
    .where('subscriptionId', '==', sub.id)
    .limit(1)
    .get();

  if (snap.empty) return;
  await snap.docs[0].ref.set({
    plan: 'free',
    subscriptionId: null,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const handler2 = PLAN_TRANSITIONS[event.type];
  if (handler2) {
    try {
      await handler2(event);
    } catch (err) {
      console.error(`Error handling ${event.type}:`, err);
      res.status(500).json({ error: err.message });
      return;
    }
  }

  res.json({ received: true });
}
