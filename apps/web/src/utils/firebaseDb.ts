import { getFirestore } from 'firebase/firestore';
import { firebaseApp } from './firebaseCore';

const customDbId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
export const db = customDbId ? getFirestore(firebaseApp, customDbId) : getFirestore(firebaseApp);
