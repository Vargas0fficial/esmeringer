import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureUser } from '../services/authService';
import {
  closeRoom,
  createRoom,
  joinRoom,
  watchRoom,
} from '../services/privateRoomService';

/** Private chat by room code: idle -> hosting (waiting for a friend) -> chatting. */
export function usePrivateRoom() {
  const [phase, setPhase] = useState('idle');
  const [code, setCode] = useState('');
  const [chatId, setChatId] = useState(null);
  const [uid, setUid] = useState(null);
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
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    stopHosting();
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
