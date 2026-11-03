import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureUser } from '../services/authService';
import {
  joinGroup,
  leaveGroup,
  sendGroupMessage,
  setGroupTyping,
  touchMember,
  watchGroupMembers,
  watchGroupMessages,
  watchGroupTyping,
} from '../services/groupService';
import { fetchBlockedIds } from '../services/safetyService';
import { slugify } from '../utils/format';

const HEARTBEAT_MS = 15_000;
const ONLINE_MS = 45_000;
const ACTIVE_GROUP_KEY = 'esmering:active-group';
const TYPING_REFRESH_MS = 3000;
const TYPING_IDLE_MS = 2500;
const TYPING_STALE_MS = 6000;

function loadActiveGroup() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_GROUP_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    return saved?.room ? saved : null;
  } catch {
    return null;
  }
}

function saveActiveGroup(room, nickname) {
  try {
    sessionStorage.setItem(ACTIVE_GROUP_KEY, JSON.stringify({ room, nickname }));
  } catch {
    /* ignore */
  }
}

function clearActiveGroup() {
  try {
    sessionStorage.removeItem(ACTIVE_GROUP_KEY);
  } catch {
    /* ignore */
  }
}

/** Public group rooms. `room` is the room id while joined, otherwise null. */
export function useGroupChat() {
  const [restored] = useState(loadActiveGroup);
  const [room, setRoom] = useState(restored?.room ?? null);
  const [uid, setUid] = useState(null);
  const [nickname, setNickname] = useState(restored?.nickname ?? '');
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingDocs, setTypingDocs] = useState([]);
  const [hidden, setHidden] = useState(() => new Set());
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(null);
  const lastSent = useRef(0);
  const idleTimer = useRef(null);
  const seen = useRef(new Map()); // uid -> { key, receivedAt }

  const stopTyping = useCallback(() => {
    clearTimeout(idleTimer.current);
    const current = active.current;
    if (lastSent.current && current) {
      lastSent.current = 0;
      setGroupTyping(current.slug, current.uid, current.nickname, false).catch((e) =>
        console.warn('Typing write:', e.message),
      );
    }
  }, []);

  const notifyTyping = useCallback(() => {
    const current = active.current;
    if (!current) return;
    const t = Date.now();
    if (t - lastSent.current > TYPING_REFRESH_MS) {
      lastSent.current = t;
      setGroupTyping(current.slug, current.uid, current.nickname, true).catch((e) =>
        console.warn('Typing write:', e.message),
      );
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [stopTyping]);

  const teardown = useCallback((leaveRemote = true) => {
    const current = active.current;
    if (!current) return;
    clearTimeout(idleTimer.current);
    lastSent.current = 0;
    active.current = null;
    current.stops.forEach((stop) => stop());
    if (leaveRemote) {
      leaveGroup(current.slug, current.uid, current.nickname).catch(() => {});
    }
  }, []);

  const join = useCallback(
    async (roomName, name) => {
      const slug = slugify(roomName);
      if (!slug) {
        setError('Use letters or numbers for the room name.');
        return;
      }
      teardown();
      setError('');
      setBusy(true);
      try {
        const user = await ensureUser();
        const blocked = await fetchBlockedIds(user.uid);
        await joinGroup(slug, user.uid, name);

        setUid(user.uid);
        setNickname(name);
        setHidden(blocked);
        setMessages([]);
        setMembers([]);
        setTypingDocs([]);
        seen.current = new Map();
        setRoom(slug);
        saveActiveGroup(slug, name);

        const current = { slug, uid: user.uid, nickname: name, stops: [] };
        active.current = current;
        current.stops.push(
          watchGroupMessages(slug, setMessages, (e) => setError(e.message)),
        );
        current.stops.push(watchGroupMembers(slug, setMembers));
        current.stops.push(
          watchGroupTyping(slug, (docs) => {
            const received = Date.now();
            // Use our own clock for "when did this arrive", so a wrong device clock can't hide it.
            const next = docs.map((d) => {
              const key = `${d.typing}-${d.updatedAt?.toMillis?.() ?? 0}`;
              const prev = seen.current.get(d.uid);
              const receivedAt = prev && prev.key === key ? prev.receivedAt : received;
              seen.current.set(d.uid, { key, receivedAt });
              return { uid: d.uid, nickname: d.nickname, typing: d.typing, receivedAt };
            });
            setNow(received);
            setTypingDocs(next);
          }),
        );
        const beat = setInterval(() => {
          touchMember(slug, user.uid, name).catch(() => {});
          setNow(Date.now());
        }, HEARTBEAT_MS);
        current.stops.push(() => clearInterval(beat));
      } catch (e) {
        setError(e.message);
        setRoom(null);
        clearActiveGroup();
      } finally {
        setBusy(false);
      }
    },
    [teardown],
  );

  const leave = useCallback(() => {
    stopTyping();
    teardown();
    clearActiveGroup();
    setRoom(null);
  }, [stopTyping, teardown]);

  const send = useCallback(
    (text) => {
      stopTyping();
      return sendGroupMessage(room, uid, nickname || 'Stranger', text);
    },
    [room, uid, nickname, stopTyping],
  );

  const hideUser = useCallback(
    (target) => setHidden((prev) => new Set(prev).add(target)),
    [],
  );

  useEffect(() => {
    if (restored) join(restored.room, restored.nickname || 'Stranger');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPageHide = () => teardown(false);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      clearTimeout(idleTimer.current);
      teardown();
    };
  }, [teardown]);

  const anyoneTyping = typingDocs.some((t) => t.typing);
  useEffect(() => {
    if (!anyoneTyping) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [anyoneTyping]);

  const onlineCount = members.filter(
    (m) => now - (m.lastSeen?.toMillis?.() ?? now) < ONLINE_MS,
  ).length;

  const typingNames = typingDocs
    .filter(
      (t) =>
        t.typing &&
        t.uid !== uid &&
        !hidden.has(t.uid) &&
        now - t.receivedAt < TYPING_STALE_MS,
    )
    .map((t) => t.nickname || 'Stranger');

  return {
    room,
    uid,
    error,
    busy,
    onlineCount: Math.max(onlineCount, room ? 1 : 0),
    messages: messages.filter((m) => !hidden.has(m.senderUid)),
    typingNames,
    notifyTyping,
    join,
    leave,
    send,
    hideUser,
  };
}