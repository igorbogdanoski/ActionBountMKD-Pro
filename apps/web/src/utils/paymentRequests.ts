import { collection, doc, addDoc, getDocs, updateDoc, query, where, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './analytics';
import type { PlanId } from 'shared';

export type PaymentMethod = 'paypal' | 'bank';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  displayName: string;
  planId: PlanId;
  method: PaymentMethod;
  amountMkd: number;
  transactionRef: string;
  note?: string;
  status: PaymentStatus;
  createdAt: string;
  processedAt?: string;
}

const COL = 'payment_requests';

export async function submitPaymentRequest(
  data: Omit<PaymentRequest, 'id' | 'status' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getPaymentRequests(status?: PaymentStatus): Promise<PaymentRequest[]> {
  const q = status
    ? query(collection(db, COL), where('status', '==', status))
    : query(collection(db, COL));
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as PaymentRequest);
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

/** A user's own payment requests, newest first — powers the "your upgrade is
 * pending review" banner on Pricing. Firestore rules only allow this query
 * when filtered to the caller's own userId (see firestore.rules). */
export async function getUserPaymentRequests(userId: string): Promise<PaymentRequest[]> {
  const q = query(collection(db, COL), where('userId', '==', userId));
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as PaymentRequest);
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

/**
 * Approve a payment request and upgrade the user's plan atomically — either
 * both writes land or neither does, so a network drop mid-approval can never
 * leave a request marked "approved" with the user still on their old plan
 * (or vice versa). The transaction also re-checks `status` server-side so a
 * double-click or retried request can't be processed twice.
 */
export async function approvePaymentRequest(requestId: string, userId: string, planId: PlanId): Promise<void> {
  let approved: PaymentRequest | null = null;
  await runTransaction(db, async (tx) => {
    const reqRef = doc(db, COL, requestId);
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists() || (reqSnap.data() as PaymentRequest).status !== 'pending') {
      throw new Error('Барањето веќе е обработено или не постои.');
    }
    approved = reqSnap.data() as PaymentRequest;
    tx.update(reqRef, {
      status: 'approved',
      processedAt: new Date().toISOString(),
    });
    tx.update(doc(db, 'user_profiles', userId), {
      plan: planId,
      updatedAt: new Date().toISOString(),
    });
  });
  // Real completed-payment signal, not just an upgrade-button click — fired
  // only once the transaction actually commits.
  trackEvent('payment_completed', {
    plan_id: planId,
    method: approved?.method,
    amount_mkd: approved?.amountMkd,
  });
}

export async function rejectPaymentRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, COL, requestId), {
    status: 'rejected',
    processedAt: new Date().toISOString(),
  });
}

