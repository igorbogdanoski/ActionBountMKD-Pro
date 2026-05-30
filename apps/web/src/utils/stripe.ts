export async function redirectToCheckout(
  planId: 'starter' | 'pro',
  userId: string,
  userEmail: string,
): Promise<void> {
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, userId, userEmail }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Грешка при отворање на плаќање.');
  }

  const { url } = await res.json();
  window.location.href = url;
}

export async function redirectToPortal(userId: string): Promise<void> {
  const res = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Грешка при отворање на портал.');
  }

  const { url } = await res.json();
  window.location.href = url;
}
