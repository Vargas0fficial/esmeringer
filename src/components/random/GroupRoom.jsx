import { useState } from 'react';
import { X } from 'lucide-react';
import Avatar from '../Avatar';
import Composer from '../chat/Composer';
import MessageBubble from '../chat/MessageBubble';
import MessageList from '../chat/MessageList';
import SafetyModal from '../SafetyModal';
import { useToast } from '../../context/ToastContext';
import { formatTime, roomTitle } from '../../utils/format';

export default function GroupRoom({ group }) {
  const { showToast } = useToast();
  const [target, setTarget] = useState(null);
  const title = roomTitle(group.room);

  const messages = group.messages.map((m) => ({
    id: m.id,
    text: m.text,
    type: m.type,
    mine: m.senderUid === group.uid,
    author: m.nickname || 'Stranger',
    senderUid: m.senderUid,
    time: formatTime(m.createdAt),
  }));

  async function send(text) {
    try {
      await group.send(text);
    } catch (error) {
      showToast(`Message not sent: ${error.message}`);
    }
  }

  return (
    <div className="random-chat-box">
      <div className="random-person">
        <Avatar name={title} size={38} />
        <div>
          <strong>{title}</strong>
          <small>
            <span className="online-dot" />
            {group.onlineCount} online · public room
          </small>
        </div>
      </div>

      <MessageList trigger={messages.length}>
        <div className="system-message">
          Everyone here is a stranger. Tap a name to report or block, and never share
          personal details.
        </div>
        {group.error && <div className="system-message">{group.error}</div>}
        {messages.map((m) =>
          m.type === 'system' ? (
            <div key={m.id} className="system-message">
              {m.text}
            </div>
          ) : (
            <MessageBubble
              key={m.id}
              message={m}
              onAuthorClick={
                m.mine ? undefined : () => setTarget({ uid: m.senderUid, name: m.author })
              }
            />
          ),
        )}
      </MessageList>

      <Composer onSend={send} placeholder={`Message ${title}...`} />

      <div className="random-controls">
        <button className="secondary-button" onClick={group.leave}>
          <X size={15} /> Leave room
        </button>
      </div>

      {target && (
        <SafetyModal
          target={target}
          context={{ groupSlug: group.room }}
          onClose={() => setTarget(null)}
          onBlocked={() => group.hideUser(target.uid)}
        />
      )}
    </div>
  );
}