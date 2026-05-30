import { collection, doc, addDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { PlanId } from '../types';

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

export async function approvePaymentRequest(requestId: string, userId: string, planId: PlanId): Promise<void> {
  await updateDoc(doc(db, COL, requestId), {
    status: 'approved',
    processedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, 'user_profiles', userId), {
    plan: planId,
    updatedAt: new Date().toISOString(),
  });
}

export async function rejectPaymentRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, COL, requestId), {
    status: 'rejected',
    processedAt: new Date().toISOString(),
  });
}
