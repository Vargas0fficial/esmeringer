import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MINUTE, expiresIn } from '../lib/expiry';
import { pickBest } from '../utils/matching';
import { newChat, publicProfile } from './chatService';

const FRESH_MS = 60_000; // a waiting entry older than this is treated as abandoned
const queueRef = (uid) => doc(db, 'queue', uid);

export function joinQueue(uid, { nickname, gender, location, topics }) {
  return setDoc(queueRef(uid), {
    uid,
    nickname,
    gender,
    location,
    topics,
    status: 'waiting',
    chatId: null,
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    expireAt: expiresIn(15 * MINUTE),
  });
}

export const heartbeatQueue = (uid) =>
  updateDoc(queueRef(uid), {
    lastSeen: serverTimestamp(),
    expireAt: expiresIn(15 * MINUTE),
  });

export const leaveQueue = (uid) => deleteDoc(queueRef(uid));

export function watchQueueEntry(uid, onChange) {
  return onSnapshot(
    queueRef(uid),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (error) => console.warn('Queue listener:', error.message),
  );
}

/** Pairs two waiting people in one transaction, so nobody can end up in two chats. */
async function createMatch(myUid, otherUid) {
  const chatRef = doc(collection(db, 'chats'));
  await runTransaction(db, async (tx) => {
    const [mine, theirs] = await Promise.all([
      tx.get(queueRef(myUid)),
      tx.get(queueRef(otherUid)),
    ]);
    if (!mine.exists() || mine.data().status !== 'waiting')
      throw new Error('already-matched');
    if (!theirs.exists() || theirs.data().status !== 'waiting')
      throw new Error('partner-unavailable');

    tx.set(
      chatRef,
      newChat({
        members: [myUid, otherUid],
        mode: 'one-on-one',
        profiles: {
          [myUid]: publicProfile(mine.data()),
          [otherUid]: publicProfile(theirs.data()),
        },
      }),
    );
    tx.update(queueRef(myUid), { status: 'matched', chatId: chatRef.id });
    tx.update(queueRef(otherUid), { status: 'matched', chatId: chatRef.id });
  });
}

/**
 * One matchmaking attempt. `skip` collects people who turned out to be unavailable or blocked
 * (the rules refuse a chat between two people when either has blocked the other).
 */
export async function findMatch(me, blocked, skip) {
  const snap = await getDocs(
    query(collection(db, 'queue'), where('status', '==', 'waiting'), limit(50)),
  );
  const now = Date.now();
  const candidates = snap.docs
    .map((d) => d.data())
    .filter((c) => {
      const seen = c.lastSeen?.toMillis?.() ?? now;
      return (
        c.uid !== me.uid &&
        !blocked.has(c.uid) &&
        !skip.has(c.uid) &&
        now - seen < FRESH_MS
      );
    });
  if (!candidates.length) return;

  const best = pickBest(me, candidates);
  try {
    await createMatch(me.uid, best.uid);
  } catch (error) {
    if (error.message === 'already-matched') return; // someone matched us first; the listener picks it up
    if (error.message === 'partner-unavailable' || error.code === 'permission-denied') {
      skip.add(best.uid);
      return;
    }
    throw error;
  }
}
