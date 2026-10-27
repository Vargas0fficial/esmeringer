import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DAY, MINUTE, expiresIn } from '../lib/expiry';

const memberRef = (slug, uid) => doc(db, 'groups', slug, 'members', uid);

/** Used both to join and as the presence heartbeat. */
export const joinGroup = (slug, uid, nickname) =>
  setDoc(memberRef(slug, uid), {
    uid,
    nickname,
    lastSeen: serverTimestamp(),
    expireAt: expiresIn(10 * MINUTE),
  });

export const leaveGroup = (slug, uid) => deleteDoc(memberRef(slug, uid));

export function watchGroupMembers(slug, onChange) {
  return onSnapshot(
    collection(db, 'groups', slug, 'members'),
    (snap) => onChange(snap.docs.map((d) => d.data())),
    (error) => console.warn('Members listener:', error.message),
  );
}

export function watchGroupMessages(slug, onChange, onError) {
  const q = query(
    collection(db, 'groups', slug, 'messages'),
    orderBy('createdAt', 'asc'),
    limitToLast(100),
  );
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })),
      ),
    onError,
  );
}

export function sendGroupMessage(slug, uid, nickname, text) {
  return addDoc(collection(db, 'groups', slug, 'messages'), {
    senderUid: uid,
    nickname,
    text,
    createdAt: serverTimestamp(),
    expireAt: expiresIn(DAY),
  });
}
