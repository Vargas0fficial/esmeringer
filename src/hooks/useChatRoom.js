import { useCallback, useEffect, useState } from 'react';
import {
  endChat,
  sendChatMessage,
  watchChat,
  watchMessages,
} from '../services/chatService';

/** Live view of one 1-on-1 or private chat. */
export function useChatRoom(chatId, uid) {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

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

  // Closing the tab counts as leaving, so the other person isn't left waiting.
  useEffect(() => {
    window.addEventListener('pagehide', leave);
    return () => window.removeEventListener('pagehide', leave);
  }, [leave]);

  const partnerUid = chat?.members.find((m) => m !== uid) ?? null;
  const ended = chat?.status === 'ended';

  return {
    chat,
    messages,
    error,
    partnerUid,
    partner: chat?.profiles?.[partnerUid] ?? null,
    myProfile: chat?.profiles?.[uid] ?? null,
    ended,
    endedByPartner: ended && chat.endedBy !== uid,
    send,
    leave,
  };
}
