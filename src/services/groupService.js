import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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

/** Presence heartbeat: refreshes your member entry without announcing anything. */
export const touchMember = (slug, uid, nickname) =>
  setDoc(memberRef(slug, uid), {
    uid,
    nickname,
    lastSeen: serverTimestamp(),
    expireAt: expiresIn(10 * MINUTE),
  });

function postSystemMessage(slug, uid, nickname, action) {
  return addDoc(collection(db, 'groups', slug, 'messages'), {
    senderUid: uid,
    nickname,
    text: `${nickname} ${action}`,
    type: 'system',
    createdAt: serverTimestamp(),
    expireAt: expiresIn(DAY),
  });
}

/** Joins the room. Announces "has joined the group" only if you weren't already a member. */
export async function joinGroup(slug, uid, nickname) {
  let isNew = true;
  try {
    isNew = !(await getDoc(memberRef(slug, uid))).exists();
  } catch {
    /* if the check fails, treat as new */
  }
  await touchMember(slug, uid, nickname);
  if (isNew) {
    await postSystemMessage(slug, uid, nickname, 'has joined the group').catch(() => {});
  }
}

/** Announces "has left the group", then removes your member entry. */
export async function leaveGroup(slug, uid, nickname) {
  if (nickname) {
    await postSystemMessage(slug, uid, nickname, 'has left the group').catch(() => {});
  }
  await deleteDoc(memberRef(slug, uid));
}

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