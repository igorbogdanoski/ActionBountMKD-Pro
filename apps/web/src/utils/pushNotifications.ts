interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

interface ExpoPushResponse {
  data?: Array<{
    status: 'ok' | 'error';
    message?: string;
    details?: { error?: string };
  }>;
  errors?: Array<{ message?: string }>;
}

export async function sendTestPushNotification(token: string): Promise<void> {
  const payload: ExpoPushMessage[] = [{
    to: token,
    title: 'АВАНТУРА',
    body: 'Ова е тест push известување од веб поставките.',
    sound: 'default',
    data: { url: '/settings' },
  }];

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json() as ExpoPushResponse;

  if (!response.ok) {
    const message = result.errors?.[0]?.message || 'Не успеа испраќањето на push известувањето.';
    throw new Error(message);
  }

  const first = result.data?.[0];
  if (!first || first.status !== 'ok') {
    const message = first?.message || first?.details?.error || 'Expo push сервисот го одби барањето.';
    throw new Error(message);
  }
}