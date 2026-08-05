import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { firebaseApp } from './firebaseCore';

export const auth = getAuth(firebaseApp);
export const provider = new GoogleAuthProvider();
