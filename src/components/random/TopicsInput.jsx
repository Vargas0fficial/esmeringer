import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MAX_TOPICS, MAX_TOPIC_LENGTH } from '../../config/constants';

export default function TopicsInput({ topics, onChange }) {
  const [draft, setDraft] = useState('');
  const full = topics.length >= MAX_TOPICS;

  function add() {
    const topic = draft.trim().slice(0, MAX_TOPIC_LENGTH);
    const duplicate = topics.some((t) => t.toLowerCase() === topic.toLowerCase());
    if (topic && !duplicate && !full) onChange([...topics, topic]);
    setDraft('');
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault(); // don't submit the whole setup form
    add();
  }

  return (
    <>
      <div className="topic-row">
        <input
          id="chat-topics"
          value={draft}
          disabled={full}
          maxLength={MAX_TOPIC_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={full ? 'Topic limit reached' : 'Type a topic and press Enter'}
        />
        <button
          type="button"
          className="topic-add"
          onClick={add}
          disabled={full || !draft.trim()}
          aria-label="Add topic"
        >
          <Plus size={16} />
        </button>
      </div>
      {topics.length > 0 && (
        <div className="topic-list">
          {topics.map((topic) => (
            <span key={topic} className="topic-chip">
              {topic}
              <button
                type="button"
                onClick={() => onChange(topics.filter((t) => t !== topic))}
                aria-label={`Remove ${topic}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
