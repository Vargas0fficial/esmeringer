import { useCallback, useEffect, useRef, useState } from 'react';
import {
  endChat,
  sendChatMessage,
  setTyping,
  watchChat,
  watchMessages,
  watchTyping,
} from '../services/chatService';

const TYPING_REFRESH_MS = 3000; // how often we re-send "typing" while you keep typing
const TYPING_IDLE_MS = 2500; // stop showing "typing" after this much silence
const TYPING_STALE_MS = 6000; // hide a partner's typing flag if no update arrived for this long

/** Live view of one 1-on-1 or private chat. */
export function useChatRoom(chatId, uid) {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [typingDoc, setTypingDoc] = useState(null);
  const [now, setNow] = useState(Date.now());
  const lastSent = useRef(0);
  const idleTimer = useRef(null);

  useEffect(() => {
    setChat(null);
    setMessages([]);
    setError('');
    if (!chatId) return undefined;
    const fail = (e) => setError(e.message);
    const stopChat = watchChat(chatId, setChat, fail);
    const stopMessages = watchMessages(chatId, setMessages, fail);
    return () => {
      stopChat();
      stopMessages();
    };
  }, [chatId]);

  const send = useCallback((text) => sendChatMessage(chatId, uid, text), [chatId, uid]);
  const leave = useCallback(() => endChat(chatId, uid).catch(() => {}), [chatId, uid]);

  const partnerUid = chat?.members.find((m) => m !== uid) ?? null;
  const ended = chat?.status === 'ended';

  // ---- typing indicator ----
  const stopTyping = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (lastSent.current && chatId && uid) {
      lastSent.current = 0;
      setTyping(chatId, uid, false).catch((e) => console.warn('Typing write:', e.message));
    }
  }, [chatId, uid]);

  const notifyTyping = useCallback(() => {
    if (!chatId || !uid) return;
    const t = Date.now();
    if (t - lastSent.current > TYPING_REFRESH_MS) {
      lastSent.current = t;
      setTyping(chatId, uid, true).catch((e) => console.warn('Typing write:', e.message));
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [chatId, uid, stopTyping]);

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  useEffect(() => {
    setTypingDoc(null);
    if (!chatId || !partnerUid) return undefined;
    return watchTyping(chatId, partnerUid, (data) => {
      const received = Date.now();
      setNow(received);
      // Use our own clock for "when did this arrive", so a wrong device clock can't hide it.
      setTypingDoc(data ? { typing: Boolean(data.typing), receivedAt: received } : null);
    });
  }, [chatId, partnerUid]);

  // While the partner is typing, re-check regularly so a stale flag disappears on its own.
  useEffect(() => {
    if (!typingDoc?.typing) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [typingDoc]);

  const partnerTyping =
    !ended && Boolean(typingDoc?.typing) && now - typingDoc.receivedAt < TYPING_STALE_MS;

  return {
    chat,
    messages,
    error,
    partnerUid,
    partner: chat?.profiles?.[partnerUid] ?? null,
    myProfile: chat?.profiles?.[uid] ?? null,
    ended,
    endedByPartner: ended && chat.endedBy !== uid,
    partnerTyping,
    notifyTyping,
    stopTyping,
    send,
    leave,
  };
}