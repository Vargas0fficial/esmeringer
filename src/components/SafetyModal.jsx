import { useState } from 'react';
import { Ban, ChevronRight, Flag, ShieldCheck, X } from 'lucide-react';
import { REPORT_REASONS } from '../config/constants';
import { useToast } from '../context/ToastContext';
import { ensureUser } from '../services/authService';
import { blockUser, submitReport } from '../services/safetyService';

/**
 * target:  { uid, name } of the person being reported / blocked
 * context: { chatId } or { groupSlug } so moderators know where it happened
 */
export default function SafetyModal({ target, context, onClose, onBlocked }) {
  const { showToast } = useToast();
  const [step, setStep] = useState('menu');
  const [busy, setBusy] = useState(false);

  async function run(task, doneMessage, after) {
    setBusy(true);
    try {
      const user = await ensureUser();
      await task(user.uid);
    } catch (error) {
      showToast(`Could not complete that: ${error.message}`);
      setBusy(false);
      return;
    }
    onClose();
    showToast(doneMessage);
    after?.();
  }

  const report = (reason) =>
    run(
      (uid) => submitReport(uid, { targetUid: target.uid, reason, ...context }),
      'Report sent. Thanks for looking out.',
    );
  const block = () =>
    run((uid) => blockUser(uid, target.uid), `${target.name} blocked.`, onBlocked);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="safety-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <div className="modal-symbol">
          <ShieldCheck />
        </div>

        {step === 'menu' ? (
          <>
            <h2>Your safety matters</h2>
            <p>
              Choose an action for {target.name}. Never share money, passwords or
              verification codes with anyone you meet here.
            </p>
            <button
              className="safety-option"
              onClick={() => setStep('reasons')}
              disabled={busy}
            >
              <Flag />
              <span>
                <strong>Report this user</strong>
                <small>Send a concern to the moderation team</small>
              </span>
              <ChevronRight />
            </button>
            <button className="safety-option" onClick={block} disabled={busy}>
              <Ban />
              <span>
                <strong>Block this user</strong>
                <small>You won’t be matched with them again</small>
              </span>
              <ChevronRight />
            </button>
          </>
        ) : (
          <>
            <h2>What happened?</h2>
            <p>Pick the closest reason.</p>
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                className="safety-option"
                onClick={() => report(reason)}
                disabled={busy}
              >
                <span>
                  <strong>{reason}</strong>
                </span>
                <ChevronRight />
              </button>
            ))}
          </>
        )}
        <button className="secondary-button full" onClick={onClose}>
          Cancel
        </button>
      </section>
    </div>
  );
}
