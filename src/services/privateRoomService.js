import {
  deleteDoc,
  doc,
  collection,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MINUTE, expiresIn } from '../lib/expiry';
import { PRIVATE_CODE_LENGTH } from '../config/constants';
import { newChat, publicProfile } from './chatService';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const roomRef = (code) => doc(db, 'privateRooms', code);

function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(PRIVATE_CODE_LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export async function createRoom(uid, profile) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode();
    try {
      await runTransaction(db, async (tx) => {
        if ((await tx.get(roomRef(code))).exists()) throw new Error('taken');
        tx.set(roomRef(code), {
          hostUid: uid,
          hostProfile: publicProfile(profile),
          status: 'open',
          chatId: null,
          guestUid: null,
          createdAt: serverTimestamp(),
          expireAt: expiresIn(30 * MINUTE),
        });
      });
      return code;
    } catch (error) {
      if (error.message !== 'taken') throw error;
    }
  }
  throw new Error('Could not create a room right now. Please try again.');
}

export function watchRoom(code, onChange) {
  return onSnapshot(
    roomRef(code),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (error) => console.warn('Room listener:', error.message),
  );
}

export const closeRoom = (code) => deleteDoc(roomRef(code));

export async function joinRoom(rawCode, uid, profile) {
  const code = rawCode.trim().toUpperCase();
  const chatRef = doc(collection(db, 'chats'));
  await runTransaction(db, async (tx) => {
    const room = await tx.get(roomRef(code));
    if (!room.exists()) throw new Error('No room with that code.');
    const { hostUid, hostProfile, status } = room.data();
    if (hostUid === uid) throw new Error('That’s your own room code.');
    if (status !== 'open') throw new Error('That room is already taken.');

    tx.set(
      chatRef,
      newChat({
        members: [hostUid, uid],
        mode: 'private',
        profiles: { [hostUid]: hostProfile, [uid]: publicProfile(profile) },
      }),
    );
    tx.update(roomRef(code), { status: 'full', chatId: chatRef.id, guestUid: uid });
  });
  return chatRef.id;
}
