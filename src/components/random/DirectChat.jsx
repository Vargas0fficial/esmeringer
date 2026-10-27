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
  const shared = sharedTopics(room.myProfile?.topics, room.partner?.topics);
  const details = [room.partner?.gender, room.partner?.location]
    .filter(Boolean)
    .join(' · ');

  const messages = room.messages.map((m) => ({
    id: m.id,
    text: m.text,
    mine: m.senderUid === uid,
    author: name,
    time: formatTime(m.createdAt),
  }));

  async function leave(goNext) {
    await room.leave();
    if (goNext) onNext();
    else onExit();
  }

  async function send(text) {
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

      <MessageList trigger={`${messages.length}-${room.ended}`}>
        <div className="system-message">
          You’re chatting with {name}.
          {shared.length > 0 && <> You both like {shared.join(', ')}.</>} Be respectful,
          and keep personal details private.
        </div>
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {room.ended && (
          <div className="system-message">
            {room.endedByPartner ? `${name} left the chat.` : 'You left the chat.'}
          </div>
        )}
      </MessageList>

      <Composer
        onSend={send}
        placeholder="Say something nice..."
        disabled={room.ended}
        maxLength={2000}
      />

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
