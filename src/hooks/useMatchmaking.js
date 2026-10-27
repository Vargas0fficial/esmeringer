import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureUser } from '../services/authService';
import {
  findMatch,
  heartbeatQueue,
  joinQueue,
  leaveQueue,
  watchQueueEntry,
} from '../services/matchmakingService';
import { fetchBlockedIds } from '../services/safetyService';

const MATCH_EVERY_MS = 3000;
const HEARTBEAT_MS = 12_000;
const ACTIVE_CHAT_KEY = 'esmering:active-chat';

/** The chat this tab is currently in, kept per-tab so a reload brings you back to it. */
function loadActiveChat() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_CHAT_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    return saved?.chatId && saved?.uid ? saved : null;
  } catch {
    return null;
  }
}

function saveActiveChat(chatId, uid) {
  try {
    sessionStorage.setItem(ACTIVE_CHAT_KEY, JSON.stringify({ chatId, uid }));
  } catch {
    /* storage unavailable — ignore */
  }
}

function clearActiveChat() {
  try {
    sessionStorage.removeItem(ACTIVE_CHAT_KEY);
  } catch {
    /* ignore */
  }
}

/** Random 1-on-1: idle -> searching -> chatting. */
export function useMatchmaking() {
  const [restored] = useState(loadActiveChat);
  const [phase, setPhase] = useState(restored ? 'chatting' : 'idle');
  const [chatId, setChatId] = useState(restored?.chatId ?? null);
  const [uid, setUid] = useState(restored?.uid ?? null);
  const [error, setError] = useState('');
  const search = useRef(null);
  const attempt = useRef(0);

  const stopSearching = useCallback(() => {
    const current = search.current;
    if (!current) return;
    search.current = null;
    clearInterval(current.matchTimer);
    clearInterval(current.beatTimer);
    current.unsubscribe?.();
    leaveQueue(current.uid).catch(() => {});
  }, []);

  const start = useCallback(
    async (profile) => {
      stopSearching();
      clearActiveChat();
      const thisAttempt = (attempt.current += 1);
      setError('');
      setChatId(null);
      setPhase('searching');
      try {
        const user = await ensureUser();
        const blocked = await fetchBlockedIds(user.uid);
        if (attempt.current !== thisAttempt) return; // cancelled while connecting

        await joinQueue(user.uid, profile);
        if (attempt.current !== thisAttempt) {
          leaveQueue(user.uid).catch(() => {});
          return;
        }

        const current = { uid: user.uid };
        search.current = current;
        setUid(user.uid);

        const me = { uid: user.uid, ...profile };
        const skip = new Set();
        let busy = false;

        current.unsubscribe = watchQueueEntry(user.uid, (entry) => {
          if (entry?.status === 'matched' && entry.chatId) {
            stopSearching();
            saveActiveChat(entry.chatId, user.uid);
            setChatId(entry.chatId);
            setPhase('chatting');
          }
        });

        const tick = async () => {
          if (busy || search.current !== current) return;
          busy = true;
          try {
            await findMatch(me, blocked, skip);
          } catch (e) {
            console.warn('Matchmaking:', e.message);
          } finally {
            busy = false;
          }
        };
        current.matchTimer = setInterval(tick, MATCH_EVERY_MS);
        current.beatTimer = setInterval(
          () => heartbeatQueue(user.uid).catch(() => {}),
          HEARTBEAT_MS,
        );
        tick();
      } catch (e) {
        if (attempt.current !== thisAttempt) return;
        setError(e.message);
        setPhase('idle');
      }
    },
    [stopSearching],
  );

  const reset = useCallback(() => {
    attempt.current += 1;
    stopSearching();
    clearActiveChat();
    setChatId(null);
    setPhase('idle');
  }, [stopSearching]);

  useEffect(() => {
    window.addEventListener('pagehide', stopSearching);
    return () => {
      window.removeEventListener('pagehide', stopSearching);
      stopSearching();
    };
  }, [stopSearching]);

  return { phase, chatId, uid, error, start, cancel: reset, reset };
}