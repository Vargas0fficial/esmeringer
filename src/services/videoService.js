import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DAY, MINUTE, expiresIn } from '../lib/expiry';

const FRESH_MS = 60_000; // a waiting entry older than this is treated as abandoned
const queueRef = (uid) => doc(db, 'videoQueue', uid);
const callRef = (id) => doc(db, 'videoCalls', id);

export function joinVideoQueue(uid, nickname) {
  return setDoc(queueRef(uid), {
    uid,
    nickname,
    status: 'waiting',
    callId: null,
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    expireAt: expiresIn(15 * MINUTE),
  });
}

export const heartbeatVideoQueue = (uid) =>
  updateDoc(queueRef(uid), {
    lastSeen: serverTimestamp(),
    expireAt: expiresIn(15 * MINUTE),
  });

export const leaveVideoQueue = (uid) => deleteDoc(queueRef(uid));

export function watchVideoQueueEntry(uid, onChange) {
  return onSnapshot(
    queueRef(uid),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (error) => console.warn('Video queue listener:', error.message),
  );
}

/** Pairs two waiting people in one transaction. The person who creates it is members[0] (the caller). */
async function createMatch(myUid, otherUid) {
  const ref = doc(collection(db, 'videoCalls'));
  await runTransaction(db, async (tx) => {
    const [mine, theirs] = await Promise.all([
      tx.get(queueRef(myUid)),
      tx.get(queueRef(otherUid)),
    ]);
    if (!mine.exists() || mine.data().status !== 'waiting')
      throw new Error('already-matched');
    if (!theirs.exists() || theirs.data().status !== 'waiting')
      throw new Error('partner-unavailable');

    tx.set(ref, {
      members: [myUid, otherUid],
      profiles: {
        [myUid]: { nickname: mine.data().nickname },
        [otherUid]: { nickname: theirs.data().nickname },
      },
      status: 'active',
      endedBy: null,
      createdAt: serverTimestamp(),
      expireAt: expiresIn(DAY),
    });
    tx.update(queueRef(myUid), { status: 'matched', callId: ref.id });
    tx.update(queueRef(otherUid), { status: 'matched', callId: ref.id });
  });
}

/** One matchmaking attempt. `skip` collects people who were unavailable or blocked. */
export async function findVideoMatch(me, blocked, skip) {
  const snap = await getDocs(
    query(collection(db, 'videoQueue'), where('status', '==', 'waiting'), limit(50)),
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

  const best = candidates[Math.floor(Math.random() * candidates.length)];
  try {
    await createMatch(me.uid, best.uid);
  } catch (error) {
    if (error.message === 'already-matched') return;
    if (error.message === 'partner-unavailable' || error.code === 'permission-denied') {
      skip.add(best.uid);
      return;
    }
    throw error;
  }
}

export function watchVideoCall(callId, onChange, onError) {
  return onSnapshot(
    callRef(callId),
    (snap) => onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError,
  );
}

export const endVideoCall = (callId, uid) =>
  updateDoc(callRef(callId), { status: 'ended', endedBy: uid });

/** WebRTC signaling messages (offer / answer / ICE candidates). */
export function sendSignal(callId, uid, type, data) {
  return addDoc(collection(db, 'videoCalls', callId, 'signals'), {
    from: uid,
    type,
    data,
    createdAt: serverTimestamp(),
    expireAt: expiresIn(DAY),
  });
}

export function watchSignals(callId, onSignal) {
  const q = query(
    collection(db, 'videoCalls', callId, 'signals'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) =>
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') onSignal(change.doc.data());
      }),
    (error) => console.warn('Signals listener:', error.message),
  );
}