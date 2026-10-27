import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureUser } from '../services/authService';
import {
  joinGroup,
  leaveGroup,
  sendGroupMessage,
  touchMember,
  watchGroupMembers,
  watchGroupMessages,
} from '../services/groupService';
import { fetchBlockedIds } from '../services/safetyService';
import { slugify } from '../utils/format';

const HEARTBEAT_MS = 15_000;
const ONLINE_MS = 45_000;
const ACTIVE_GROUP_KEY = 'esmering:active-group';

/** The group room this tab is in, kept per-tab so a reload brings you back to it. */
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
    /* storage unavailable — ignore */
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
  const [hidden, setHidden] = useState(() => new Set());
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(null);

  // leaveRemote=false keeps your member entry (used on reload / tab close).
  const teardown = useCallback((leaveRemote = true) => {
    const current = active.current;
    if (!current) return;
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
        setRoom(slug);
        saveActiveGroup(slug, name);

        const current = { slug, uid: user.uid, nickname: name, stops: [] };
        active.current = current;
        current.stops.push(
          watchGroupMessages(slug, setMessages, (e) => setError(e.message)),
        );
        current.stops.push(watchGroupMembers(slug, setMembers));
        const beat = setInterval(() => {
          touchMember(slug, user.uid, name).catch(() => {});
          setNow(Date.now());
        }, HEARTBEAT_MS);
        current.stops.push(() => clearInterval(beat));
      } catch (e) {
        setError(e.message);
        // Failed to (re)join: fall back to the setup screen.
        setRoom(null);
        clearActiveGroup();
      } finally {
        setBusy(false);
      }
    },
    [teardown],
  );

  const leave = useCallback(() => {
    teardown();
    clearActiveGroup();
    setRoom(null);
  }, [teardown]);

  const send = useCallback(
    (text) => sendGroupMessage(room, uid, nickname || 'Stranger', text),
    [room, uid, nickname],
  );

  const hideUser = useCallback(
    (target) => setHidden((prev) => new Set(prev).add(target)),
    [],
  );

  // After a reload, rejoin the room we were in (no "joined" message: your member entry still exists).
  useEffect(() => {
    if (restored) join(restored.room, restored.nickname || 'Stranger');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPageHide = () => teardown(false);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      teardown();
    };
  }, [teardown]);

  const onlineCount = members.filter(
    (m) => now - (m.lastSeen?.toMillis?.() ?? now) < ONLINE_MS,
  ).length;

  return {
    room,
    uid,
    error,
    busy,
    onlineCount: Math.max(onlineCount, room ? 1 : 0),
    messages: messages.filter((m) => !hidden.has(m.senderUid)),
    join,
    leave,
    send,
    hideUser,
  };
}