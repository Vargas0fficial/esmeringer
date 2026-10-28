import WritingLogo from './WritingLogo';

export default function SearchingView({ onCancel }) {
  return (
    <div className="status-card" role="status">
      <WritingLogo />
      <h2>Looking for someone…</h2>
      <p>
        This can take a moment when few people are online. You can leave this page open.
      </p>
      <button className="secondary-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}