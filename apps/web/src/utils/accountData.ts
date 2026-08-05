import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Query,
} from 'firebase/firestore';
import { db } from './firebase';

const DELETION_REQUESTS = 'account_deletion_requests';
const LOCAL_DATA_PREFIXES = ['ak_', 'av_', 'avk_', 'ab_', 'actionbound_'];

export type AccountDeletionStatus =
  | 'pending'
  | 'cancelled'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export interface AccountDeletionRequest {
  userId: string;
  email: string;
  status: AccountDeletionStatus;
  requestedAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface AccountExportIdentity {
  uid: string;
  email: string;
  displayName: string;
}

interface ExportedDocument extends DocumentData {
  _documentId: string;
}

interface QuestOwnedData {
  questId: string;
  results: ExportedDocument[];
  telemetry: ExportedDocument[];
  feedback: ExportedDocument[];
}

export interface AccountDataExport {
  schemaVersion: 2;
  exportedAt: string;
  identity: AccountExportIdentity;
  firestore: {
    profile: ExportedDocument | null;
    settings: ExportedDocument | null;
    quests: ExportedDocument[];
    questStages: ExportedDocument[];
    classGroups: ExportedDocument[];
    paymentRequests: ExportedDocument[];
    questOwnedData: QuestOwnedData[];
    deletionRequest: ExportedDocument | null;
  };
  localAppData: Record<string, string>;
  coverage: {
    included: string[];
    manualArchiveRequired: string[];
  };
}

function withId(id: string, data: DocumentData): ExportedDocument {
  // The snapshot id is authoritative; stored data must not be able to spoof it.
  return { ...data, _documentId: id };
}

async function readDocument(collectionName: string, id: string): Promise<ExportedDocument | null> {
  const snapshot = await getDoc(doc(db, collectionName, id));
  return snapshot.exists() ? withId(snapshot.id, snapshot.data()) : null;
}

async function readQuery(q: Query): Promise<ExportedDocument[]> {
  const snapshot = await getDocs(q);
  return snapshot.docs.map(item => withId(item.id, item.data()));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return output;
}

export function readLocalAccountData(storage: Storage | null): Record<string, string> {
  if (!storage) return {};
  const output: Record<string, string> = {};
  try {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key || !LOCAL_DATA_PREFIXES.some(prefix => key.startsWith(prefix))) continue;
      const value = storage.getItem(key);
      if (value !== null) output[key] = value;
    }
  } catch {
    return {};
  }
  return Object.fromEntries(Object.entries(output).sort(([left], [right]) => left.localeCompare(right)));
}

export async function buildAccountDataExport(
  identity: AccountExportIdentity,
  localStorage: Storage | null = typeof window === 'undefined' ? null : window.localStorage,
): Promise<AccountDataExport> {
  const [profile, settings, quests, questStages, classGroups, paymentRequests, deletionRequest] = await Promise.all([
    readDocument('user_profiles', identity.uid),
    readDocument('user_settings', identity.uid),
    readQuery(query(collection(db, 'quests'), where('creatorId', '==', identity.uid))),
    readQuery(query(collection(db, 'quest_stages'), where('creatorId', '==', identity.uid))),
    readQuery(query(collection(db, 'class_groups'), where('ownerId', '==', identity.uid))),
    readQuery(query(collection(db, 'payment_requests'), where('userId', '==', identity.uid))),
    readDocument(DELETION_REQUESTS, identity.uid),
  ]);

  const questOwnedData = await mapWithConcurrency(quests, 5, async quest => {
    const questId = quest._documentId;
    const [results, telemetry, feedback] = await Promise.all([
      readQuery(query(collection(db, 'quest_results'), where('questId', '==', questId))),
      readQuery(query(collection(db, 'quest_result_telemetry'), where('questId', '==', questId))),
      readQuery(query(collection(db, 'quest_feedback'), where('questId', '==', questId))),
    ]);
    return { questId, results, telemetry, feedback };
  });

  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    identity,
    firestore: {
      profile,
      settings,
      quests,
      questStages,
      classGroups,
      paymentRequests,
      questOwnedData,
      deletionRequest,
    },
    localAppData: readLocalAccountData(localStorage),
    coverage: {
      included: [
        'Firebase profile and settings',
        'owned quests, quest stages, groups, results, telemetry and feedback',
        'payment and deletion requests',
        'Avantura-prefixed browser-local data',
      ],
      manualArchiveRequired: [
        'Firebase Authentication provider metadata',
        'uploaded Storage object binaries',
        'non-enumerable roster launch and live-session documents',
      ],
    },
  };
}

export function downloadAccountData(data: AccountDataExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `avantura-account-data-${data.identity.uid}-${data.exportedAt.slice(0, 10)}.json`;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function getAccountDeletionRequest(userId: string): Promise<AccountDeletionRequest | null> {
  const snapshot = await getDoc(doc(db, DELETION_REQUESTS, userId));
  return snapshot.exists() ? snapshot.data() as AccountDeletionRequest : null;
}

export async function requestAccountDeletion(userId: string, email: string): Promise<AccountDeletionRequest> {
  const timestamp = new Date().toISOString();
  const request: AccountDeletionRequest = {
    userId,
    email,
    status: 'pending',
    requestedAt: timestamp,
    updatedAt: timestamp,
  };
  await setDoc(doc(db, DELETION_REQUESTS, userId), request);
  return request;
}

export async function cancelAccountDeletion(userId: string): Promise<void> {
  await updateDoc(doc(db, DELETION_REQUESTS, userId), {
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  });
}
