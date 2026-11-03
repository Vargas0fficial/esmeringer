import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, ShieldCheck, Shuffle, Video as VideoIcon, VideoOff, X } from 'lucide-react';
import Avatar from '../Avatar';
import SafetyModal from '../SafetyModal';

function StreamVideo({ stream, muted = false, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream ?? null;
    if (stream) el.play?.().catch(() => {});
  }, [stream]);
  return <video ref={ref} className={className} autoPlay playsInline muted={muted} />;
}

/** Random video call. Remote video and audio stay hidden until you choose to show them. */
export default function VideoChat({ video, onNext, onExit }) {
  const [revealed, setRevealed] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const name = video.partner?.nickname || 'Stranger';
  const connecting = video.phase === 'connecting';
  const ended = video.phase === 'ended';

  return (
    <div className="random-chat-box video-box">
      <div className="random-person">
        <Avatar name={name} size={38} />
        <div>
          <strong>{name}</strong>
          <small>
            <span className={`online-dot ${ended ? 'offline' : ''}`} />
            {ended ? 'Call ended' : connecting ? 'Connecting…' : 'Video call'}
          </small>
        </div>
        <button
          className="icon-button"
          onClick={() => setSafetyOpen(true)}
          aria-label="Safety options"
          disabled={!video.partnerUid}
        >
          <ShieldCheck />
        </button>
      </div>

      <div className="video-stage">
        <StreamVideo
          stream={video.remoteStream}
          muted={!revealed}
          className={`video-remote ${revealed ? '' : 'blurred'}`}
        />

        {connecting && <div className="video-overlay">Connecting video…</div>}

        {ended && (
          <div className="video-overlay">
            {video.error ||
              (video.endedByPartner ? `${name} left the call.` : 'The call has ended.')}
          </div>
        )}

        {!connecting && !ended && !revealed && (
          <div className="video-overlay">
            <p>Video is hidden until you’re ready.</p>
            <button type="button" className="primary-button" onClick={() => setRevealed(true)}>
              Show video
            </button>
          </div>
        )}

        {!ended && (
          <StreamVideo
            stream={video.localStream}
            muted
            className={`video-local ${video.camOn ? '' : 'cam-off'}`}
          />
        )}
      </div>

      <div className="random-controls video-controls">
        <button
          type="button"
          className={`icon-button ${video.micOn ? '' : 'off'}`}
          onClick={video.toggleMic}
          aria-label={video.micOn ? 'Mute microphone' : 'Unmute microphone'}
          disabled={ended}
        >
          {video.micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button
          type="button"
          className={`icon-button ${video.camOn ? '' : 'off'}`}
          onClick={video.toggleCam}
          aria-label={video.camOn ? 'Turn camera off' : 'Turn camera on'}
          disabled={ended}
        >
          {video.camOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
        </button>
        <button className="secondary-button" onClick={onExit}>
          <X size={15} /> Leave
        </button>
        <button className="primary-button" onClick={onNext}>
          <Shuffle size={15} /> Next person
        </button>
      </div>

      {safetyOpen && video.partnerUid && (
        <SafetyModal
          target={{ uid: video.partnerUid, name }}
          context={{ chatId: video.callId }}
          onClose={() => setSafetyOpen(false)}
          onBlocked={onExit}
        />
      )}
    </div>
  );
}