import type {
  AccountDataExport,
  AccountDeletionRequest,
  AccountExportIdentity,
} from '../../apps/web/src/utils/accountData';

const REQUEST_KEY = 'qa-account-deletion-request';
const DOWNLOAD_KEY = 'qa-account-export-downloaded';

function readRequest(): AccountDeletionRequest | null {
  const value = localStorage.getItem(REQUEST_KEY);
  return value ? JSON.parse(value) as AccountDeletionRequest : null;
}

export async function buildAccountDataExport(identity: AccountExportIdentity): Promise<AccountDataExport> {
  return {
    schemaVersion: 1,
    exportedAt: '2026-08-04T12:00:00.000Z',
    identity,
    firestore: {
      profile: null,
      settings: null,
      quests: [],
      classGroups: [],
      paymentRequests: [],
      questOwnedData: [],
      deletionRequest: null,
    },
    localAppData: {},
    coverage: { included: ['QA browser contract'], manualArchiveRequired: [] },
  };
}

export function downloadAccountData(data: AccountDataExport): void {
  localStorage.setItem(DOWNLOAD_KEY, data.identity.uid);
}

export async function getAccountDeletionRequest(): Promise<AccountDeletionRequest | null> {
  return readRequest();
}

export async function requestAccountDeletion(userId: string, email: string): Promise<AccountDeletionRequest> {
  const timestamp = '2026-08-04T12:00:00.000Z';
  const request: AccountDeletionRequest = {
    userId,
    email,
    status: 'pending',
    requestedAt: timestamp,
    updatedAt: timestamp,
  };
  localStorage.setItem(REQUEST_KEY, JSON.stringify(request));
  return request;
}

export async function cancelAccountDeletion(): Promise<void> {
  const current = readRequest();
  if (!current) return;
  localStorage.setItem(REQUEST_KEY, JSON.stringify({ ...current, status: 'cancelled' }));
}
