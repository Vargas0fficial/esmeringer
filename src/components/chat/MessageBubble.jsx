import Avatar from '../Avatar';

/** message: { text, mine, time?, author? }. Pass onAuthorClick to make the author name tappable. */
export default function MessageBubble({ message, onAuthorClick }) {
  const { mine, text, time, author } = message;
  const myName = author || 'You';

  return (
    <div className={`message-line ${mine ? 'mine' : ''}`}>
      {!mine && <Avatar name={author} size={26} />}
      <div className={`message-bubble ${mine ? 'mine-bubble' : 'theirs'}`}>
        {mine && <span className="message-author-mine">{myName}</span>}
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
      {mine && <Avatar name={myName} size={26} mine />}
    </div>
  );
}