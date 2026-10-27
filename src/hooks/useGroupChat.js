import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureUser } from '../services/authService';
import {
  joinGroup,
  leaveGroup,
  sendGroupMessage,
  watchGroupMembers,
  watchGroupMessages,
} from '../services/groupService';
import { fetchBlockedIds } from '../services/safetyService';
import { slugify } from '../utils/format';

const HEARTBEAT_MS = 15_000;
const ONLINE_MS = 45_000;

/** Public group rooms. `room` is the room id while joined, otherwise null. */
export function useGroupChat() {
  const [room, setRoom] = useState(null);
  const [uid, setUid] = useState(null);
  const [nickname, setNickname] = useState('');
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [hidden, setHidden] = useState(() => new Set());
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(null);

  const teardown = useCallback(() => {
    const current = active.current;
    if (!current) return;
    active.current = null;
    current.stops.forEach((stop) => stop());
    leaveGroup(current.slug, current.uid).catch(() => {});
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

        const current = { slug, uid: user.uid, stops: [] };
        active.current = current;
        current.stops.push(
          watchGroupMessages(slug, setMessages, (e) => setError(e.message)),
        );
        current.stops.push(watchGroupMembers(slug, setMembers));
        const beat = setInterval(() => {
          joinGroup(slug, user.uid, name).catch(() => {});
          setNow(Date.now());
        }, HEARTBEAT_MS);
        current.stops.push(() => clearInterval(beat));
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [teardown],
  );

  const leave = useCallback(() => {
    teardown();
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

  useEffect(() => {
    window.addEventListener('pagehide', teardown);
    return () => {
      window.removeEventListener('pagehide', teardown);
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
