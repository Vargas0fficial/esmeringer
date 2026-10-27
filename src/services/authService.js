import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';

// There are no accounts: every visitor gets an anonymous Firebase session.
let pending = null;
function signInOnce() {
  pending ??= signInAnonymously(auth).finally(() => {
    pending = null;
  });
  return pending;
}

export async function ensureUser() {
  if (!auth) throw new Error('Firebase isn’t configured yet.');
  await auth.authStateReady();
  return auth.currentUser ?? (await signInOnce()).user;
}

export function watchSession(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user);
    if (!user) signInOnce().catch((e) => console.warn('Anonymous sign-in:', e.message));
  });
}
