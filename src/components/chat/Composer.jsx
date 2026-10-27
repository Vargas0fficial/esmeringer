import { useState } from 'react';
import { Send } from 'lucide-react';

export default function Composer({
  onSend,
  placeholder = 'Write a message...',
  disabled = false,
  maxLength = 500,
}) {
  const [draft, setDraft] = useState('');

  function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft('');
  }

  return (
    <form className="message-composer" onSubmit={submit}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={maxLength}
        disabled={disabled}
      />
      <button
        className="send-button"
        type="submit"
        aria-label="Send message"
        disabled={disabled}
      >
        <Send size={17} />
      </button>
    </form>
  );
}
