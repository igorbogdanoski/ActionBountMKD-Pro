import type { PlanId } from 'shared';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'paypal' | 'bank';

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

let requests: PaymentRequest[] = [{
  id: 'qa-payment-1',
  userId: 'qa-customer-1',
  userEmail: 'customer@example.test',
  displayName: 'QA Наставник',
  planId: 'pro',
  method: 'bank',
  amountMkd: 4990,
  transactionRef: 'QA-BANK-001',
  status: 'pending',
  createdAt: '2026-07-18T10:00:00.000Z',
}];

export async function getPaymentRequests(status?: PaymentStatus) {
  return status ? requests.filter(request => request.status === status) : requests;
}

export async function approvePaymentRequest(requestId: string) {
  requests = requests.map(request => request.id === requestId ? { ...request, status: 'approved' } : request);
}

export async function rejectPaymentRequest(requestId: string) {
  requests = requests.map(request => request.id === requestId ? { ...request, status: 'rejected' } : request);
}

export async function submitPaymentRequest() { return 'qa-payment-new'; }
export async function getUserPaymentRequests() { return []; }
