import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureUser } from '../services/authService';
import {
  closeRoom,
  createRoom,
  joinRoom,
  watchRoom,
} from '../services/privateRoomService';

const ACTIVE_PRIVATE_KEY = 'esmering:active-private';

/** The private chat this tab is in, kept per-tab so a reload brings you back to it. */
function loadActivePrivate() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_PRIVATE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    return saved?.chatId && saved?.uid ? saved : null;
  } catch {
    return null;
  }
}

function saveActivePrivate(chatId, uid) {
  try {
    sessionStorage.setItem(ACTIVE_PRIVATE_KEY, JSON.stringify({ chatId, uid }));
  } catch {
    /* storage unavailable — ignore */
  }
}

function clearActivePrivate() {
  try {
    sessionStorage.removeItem(ACTIVE_PRIVATE_KEY);
  } catch {
    /* ignore */
  }
}

/** Private chat by room code: idle -> hosting (waiting for a friend) -> chatting. */
export function usePrivateRoom() {
  const [restored] = useState(loadActivePrivate);
  const [phase, setPhase] = useState(restored ? 'chatting' : 'idle');
  const [code, setCode] = useState('');
  const [chatId, setChatId] = useState(restored?.chatId ?? null);
  const [uid, setUid] = useState(restored?.uid ?? null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const hosting = useRef(null);

  const stopHosting = useCallback(() => {
    const current = hosting.current;
    if (!current) return;
    hosting.current = null;
    current.unsubscribe();
    closeRoom(current.code).catch(() => {});
  }, []);

  const create = useCallback(
    async (profile) => {
      stopHosting();
      clearActivePrivate();
      setError('');
      setBusy(true);
      try {
        const user = await ensureUser();
        const roomCode = await createRoom(user.uid, profile);
        setUid(user.uid);
        setCode(roomCode);
        setPhase('hosting');
        const current = { code: roomCode };
        hosting.current = current;
        current.unsubscribe = watchRoom(roomCode, (room) => {
          if (room?.chatId) {
            stopHosting();
            saveActivePrivate(room.chatId, user.uid);
            setChatId(room.chatId);
            setPhase('chatting');
          }
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [stopHosting],
  );

  const join = useCallback(async (roomCode, profile) => {
    setError('');
    setBusy(true);
    try {
      const user = await ensureUser();
      const id = await joinRoom(roomCode, user.uid, profile);
      setUid(user.uid);
      setChatId(id);
      setPhase('chatting');
      saveActivePrivate(id, user.uid);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    stopHosting();
    clearActivePrivate();
    setChatId(null);
    setCode('');
    setPhase('idle');
  }, [stopHosting]);

  useEffect(() => {
    window.addEventListener('pagehide', stopHosting);
    return () => {
      window.removeEventListener('pagehide', stopHosting);
      stopHosting();
    };
  }, [stopHosting]);

  return { phase, code, chatId, uid, error, busy, create, join, cancel: reset, reset };
}