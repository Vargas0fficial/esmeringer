import { useToast } from '../../context/ToastContext';

export default function PrivateWaiting({ code, onCancel }) {
  const { showToast } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Code copied.');
    } catch {
      showToast('Couldn’t copy. Select the code and copy it by hand.');
    }
  }

  return (
    <div className="status-card">
      <h2>Your room is ready</h2>
      <p>Send this code to your friend. The chat starts as soon as they enter it.</p>
      <div className="code-box">{code}</div>
      <div className="random-controls">
        <button className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" onClick={copy}>
          Copy code
        </button>
      </div>
    </div>
  );
}
