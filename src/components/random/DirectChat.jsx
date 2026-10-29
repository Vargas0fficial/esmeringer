import { useState } from 'react';
import { ShieldCheck, Shuffle, X } from 'lucide-react';
import Avatar from '../Avatar';
import Composer from '../chat/Composer';
import MessageBubble from '../chat/MessageBubble';
import MessageList from '../chat/MessageList';
import SafetyModal from '../SafetyModal';
import { useToast } from '../../context/ToastContext';
import { useChatRoom } from '../../hooks/useChatRoom';
import { formatTime } from '../../utils/format';
import { sharedTopics } from '../../utils/matching';

/** A live 1-on-1 chat. `onNext` is only passed for random chats. */
export default function DirectChat({ chatId, uid, onExit, onNext }) {
  const { showToast } = useToast();
  const room = useChatRoom(chatId, uid);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const name = room.partner?.nickname || 'Stranger';
  const myName = room.myProfile?.nickname || 'You';
  const partnerTopics = room.partner?.topics ?? [];
  const shared = sharedTopics(room.myProfile?.topics, partnerTopics);
  const sharedKeys = new Set(shared.map((t) => t.trim().toLowerCase()));
  const details = [room.partner?.gender, room.partner?.location]
    .filter(Boolean)
    .join(' · ');

  const messages = room.messages.map((m) => {
    const mine = m.senderUid === uid;
    return {
      id: m.id,
      text: m.text,
      mine,
      author: mine ? myName : name,
      time: formatTime(m.createdAt),
    };
  });

  async function leave(goNext) {
    room.stopTyping();
    await room.leave();
    if (goNext) onNext();
    else onExit();
  }

  async function send(text) {
    room.stopTyping();
    try {
      await room.send(text);
    } catch (error) {
      showToast(`Message not sent: ${error.message}`);
    }
  }

  if (room.error) {
    return (
      <div className="status-card">
        <h2>Can’t open this chat</h2>
        <p>{room.error}</p>
        <button className="primary-button" onClick={onExit}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="random-chat-box">
      <div className="random-person">
        <Avatar name={name} size={38} />
        <div>
          <strong>{name}</strong>
          <small>
            <span className={`online-dot ${room.ended ? 'offline' : ''}`} />
            {room.ended ? 'Chat ended' : `Connected${details ? ` · ${details}` : ''}`}
          </small>
        </div>
        <button
          className="icon-button"
          onClick={() => setSafetyOpen(true)}
          aria-label="Safety options"
        >
          <ShieldCheck />
        </button>
      </div>

      <MessageList trigger={`${messages.length}-${room.ended}-${room.partnerTyping}`}>
        <div className="system-message">
          You’re chatting with {name}.
          {shared.length > 0 && <> You both like {shared.join(', ')}.</>} Be respectful,
          and keep personal details private.
        </div>
        {partnerTopics.length > 0 && (
          <div className="partner-topics">
            <span className="partner-topics-label">{name} likes</span>
            {partnerTopics.map((topic) => (
              <span
                key={topic}
                className={`partner-topic-chip ${
                  sharedKeys.has(topic.trim().toLowerCase()) ? 'shared' : ''
                }`}
              >
                {topic}
              </span>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {room.partnerTyping && (
          <div className="message-line typing-line" aria-live="polite">
            <Avatar name={name} size={26} />
            <div className="message-bubble theirs typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="visually-hidden">{name} is typing</span>
            </div>
          </div>
        )}
        {room.ended && (
          <div className="system-message">
            {room.endedByPartner ? `${name} left the chat.` : 'You left the chat.'}
          </div>
        )}
      </MessageList>

      {/* onInput bubbles up from the composer's text field, so Composer needs no changes. */}
      <div style={{ display: 'contents' }} onInput={room.notifyTyping}>
        <Composer
          onSend={send}
          placeholder={room.ended ? 'This chat has ended' : 'Say something nice...'}
          disabled={room.ended}
          maxLength={2000}
        />
      </div>

      <div className="random-controls">
        <button className="secondary-button" onClick={() => leave(false)}>
          <X size={15} /> Leave chat
        </button>
        {onNext && (
          <button className="primary-button" onClick={() => leave(true)}>
            <Shuffle size={15} /> Next person
          </button>
        )}
      </div>

      {safetyOpen && room.partnerUid && (
        <SafetyModal
          target={{ uid: room.partnerUid, name }}
          context={{ chatId }}
          onClose={() => setSafetyOpen(false)}
          onBlocked={() => leave(false)}
        />
      )}
    </div>
  );
}