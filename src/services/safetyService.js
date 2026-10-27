import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export function submitReport(
  uid,
  { targetUid, reason, chatId = null, groupSlug = null },
) {
  return addDoc(collection(db, 'reports'), {
    reporterUid: uid,
    targetUid,
    chatId,
    groupSlug,
    reason,
    status: 'new',
    createdAt: serverTimestamp(),
  });
}

// The id is deterministic so security rules can check "did either side block the other?".
export function blockUser(uid, targetUid) {
  return setDoc(doc(db, 'blocks', `${uid}_${targetUid}`), {
    blockerUid: uid,
    blockedUid: targetUid,
    createdAt: serverTimestamp(),
  });
}

export async function fetchBlockedIds(uid) {
  const snap = await getDocs(
    query(collection(db, 'blocks'), where('blockerUid', '==', uid)),
  );
  return new Set(snap.docs.map((d) => d.data().blockedUid));
}
