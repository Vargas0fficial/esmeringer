import {
  addDoc,
  collection,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DAY, expiresIn } from '../lib/expiry';

/** Only what the other person is allowed to see. */
export const publicProfile = ({ nickname, gender, location, topics }) => ({
  nickname,
  gender,
  location,
  topics,
});

export const newChat = ({ members, mode, profiles }) => ({
  members,
  mode,
  profiles,
  status: 'active',
  endedBy: null,
  createdAt: serverTimestamp(),
  expireAt: expiresIn(DAY),
});

export function watchChat(chatId, onChange, onError) {
  return onSnapshot(
    doc(db, 'chats', chatId),
    (snap) => onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError,
  );
}

export function watchMessages(chatId, onChange, onError) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limitToLast(200),
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

export function sendChatMessage(chatId, uid, text) {
  return addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderUid: uid,
    text,
    createdAt: serverTimestamp(),
    expireAt: expiresIn(DAY),
  });
}

export const endChat = (chatId, uid) =>
  updateDoc(doc(db, 'chats', chatId), { status: 'ended', endedBy: uid });

const typingRef = (chatId, uid) => doc(db, 'chats', chatId, 'typing', uid);

/** Marks you as typing (true) or idle (false). */
export const setTyping = (chatId, uid, typing) =>
  setDoc(typingRef(chatId, uid), {
    uid,
    typing,
    updatedAt: serverTimestamp(),
    expireAt: expiresIn(DAY),
  });

/** Watches one person's typing status. */
export function watchTyping(chatId, uid, onChange) {
  return onSnapshot(
    typingRef(chatId, uid),
    (snap) =>
      onChange(snap.exists() ? snap.data({ serverTimestamps: 'estimate' }) : null),
    () => {},
  );
}