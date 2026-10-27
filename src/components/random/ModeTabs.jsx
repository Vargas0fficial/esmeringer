import { CHAT_MODES } from '../../config/constants';

export default function ModeTabs({ mode, onChange }) {
  return (
    <div className="segmented" role="tablist" aria-label="Chat mode">
      {CHAT_MODES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          className={mode === id ? 'selected' : ''}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
