import Avatar from '../Avatar';

/** message: { text, mine, time?, author? }. Pass onAuthorClick to make the author name tappable. */
export default function MessageBubble({ message, onAuthorClick }) {
  const { mine, text, time, author } = message;
  return (
    <div className={`message-line ${mine ? 'mine' : ''}`}>
      {!mine && <Avatar name={author} size={26} />}
      <div className={`message-bubble ${mine ? 'mine-bubble' : 'theirs'}`}>
        {!mine && author && (
          <button
            className="message-author"
            onClick={onAuthorClick}
            disabled={!onAuthorClick}
          >
            {author}
          </button>
        )}
        {text}
        {time && <small>{time}</small>}
      </div>
    </div>
  );
}
