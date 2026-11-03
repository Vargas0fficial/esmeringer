import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureUser } from '../services/authService';
import { fetchBlockedIds } from '../services/safetyService';
import { getIceServers } from '../lib/iceServers';
import {
  endVideoCall,
  findVideoMatch,
  heartbeatVideoQueue,
  joinVideoQueue,
  leaveVideoQueue,
  sendSignal,
  watchSignals,
  watchVideoCall,
  watchVideoQueueEntry,
} from '../services/videoService';

const MATCH_EVERY_MS = 3000;
const HEARTBEAT_MS = 12_000;
const CONNECT_TIMEOUT_MS = 30_000;

function mediaErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError')
    return 'Camera and microphone access was blocked. Allow it in your browser settings, then try again.';
  if (error?.name === 'NotFoundError')
    return 'No camera or microphone was found on this device.';
  return error?.message || 'Could not start the camera.';
}

/** Random video chat: idle -> searching -> connecting -> chatting -> ended. */
export function useVideoCall() {
  const [phase, setPhase] = useState('idle');
  const [callId, setCallId] = useState(null);
  const [uid, setUid] = useState(null);
  const [partner, setPartner] = useState(null);
  const [partnerUid, setPartnerUid] = useState(null);
  const [error, setError] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [endedByPartner, setEndedByPartner] = useState(false);

  const search = useRef(null);
  const attempt = useRef(0);
  const conn = useRef(null);
  const local = useRef(null);
  const active = useRef(null); // { id, uid } of the call we are in

  const ensureMedia = useCallback(async () => {
    const live = local.current?.getTracks().some((t) => t.readyState === 'live');
    if (live) return local.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        'This browser can’t use the camera. Try opening the site in Safari or Chrome.',
      );
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true,
    });
    local.current = stream;
    setLocalStream(stream);
    setMicOn(true);
    setCamOn(true);
    return stream;
  }, []);

  const stopLocal = useCallback(() => {
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    setLocalStream(null);
  }, []);

  const stopSearching = useCallback(() => {
    const current = search.current;
    if (!current) return;
    search.current = null;
    clearInterval(current.matchTimer);
    clearInterval(current.beatTimer);
    current.unsubscribe?.();
    leaveVideoQueue(current.uid).catch(() => {});
  }, []);

  const closeConnection = useCallback(() => {
    const current = conn.current;
    conn.current = null;
    if (current) {
      current.stops.forEach((stop) => stop());
      current.pc?.close();
    }
    setRemoteStream(null);
  }, []);

  const endActive = useCallback(() => {
    const current = active.current;
    active.current = null;
    if (current) endVideoCall(current.id, current.uid).catch(() => {});
  }, []);

  const connect = useCallback(
    async (id, myUid, thisAttempt) => {
      setCallId(id);
      setPhase('connecting');
      active.current = { id, uid: myUid };
      const current = { stops: [], pc: null };
      conn.current = current;

      const fail = (message) => {
        if (conn.current !== current) return;
        setError(message);
        closeConnection();
        endActive();
        setPhase('ended');
      };

      try {
        const iceServers = await getIceServers();
        if (attempt.current !== thisAttempt || conn.current !== current) return;

        const pc = new RTCPeerConnection({ iceServers });
        current.pc = pc;

        const remote = new MediaStream();
        pc.ontrack = (event) => {
          remote.addTrack(event.track);
          setRemoteStream(remote);
        };
        local.current?.getTracks().forEach((track) => pc.addTrack(track, local.current));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal(id, myUid, 'candidate', JSON.stringify(event.candidate)).catch(
              () => {},
            );
          }
        };
        pc.onconnectionstatechange = () => {
          if (conn.current !== current) return;
          if (pc.connectionState === 'connected') setPhase('chatting');
          if (pc.connectionState === 'failed')
            fail('The video connection failed. Try the next person.');
        };

        const timer = setTimeout(() => {
          if (pc.connectionState !== 'connected')
            fail('Couldn’t connect. Try the next person.');
        }, CONNECT_TIMEOUT_MS);
        current.stops.push(() => clearTimeout(timer));

        // Signals are handled one at a time so candidates never race the offer/answer.
        const buffered = [];
        let chain = Promise.resolve();
        const flush = async () => {
          while (buffered.length) await pc.addIceCandidate(buffered.shift());
        };
        const handle = (signal) => {
          chain = chain.then(async () => {
            try {
              const data = JSON.parse(signal.data);
              if (signal.type === 'offer') {
                await pc.setRemoteDescription(data);
                await flush();
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendSignal(id, myUid, 'answer', JSON.stringify(pc.localDescription));
              } else if (signal.type === 'answer') {
                if (pc.signalingState === 'have-local-offer') {
                  await pc.setRemoteDescription(data);
                  await flush();
                }
              } else if (signal.type === 'candidate') {
                if (pc.remoteDescription) await pc.addIceCandidate(data);
                else buffered.push(data);
              }
            } catch (e) {
              console.warn('Signal:', e.message);
            }
          });
        };

        const begin = async (call) => {
          current.stops.push(
            watchSignals(id, (signal) => {
              if (signal.from !== myUid) handle(signal);
            }),
          );
          if (call.members[0] === myUid) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await sendSignal(id, myUid, 'offer', JSON.stringify(pc.localDescription));
            } catch (e) {
              fail(e.message);
            }
          }
        };

        let begun = false;
        current.stops.push(
          watchVideoCall(
            id,
            (call) => {
              if (!call || attempt.current !== thisAttempt || conn.current !== current)
                return;
              const other = call.members.find((m) => m !== myUid) ?? null;
              setPartnerUid(other);
              setPartner(call.profiles?.[other] ?? null);
              if (call.status === 'ended') {
                closeConnection();
                active.current = null;
                setEndedByPartner(call.endedBy !== myUid);
                setPhase('ended');
                return;
              }
              if (!begun) {
                begun = true;
                begin(call);
              }
            },
            (e) => fail(e.message),
          ),
        );
      } catch (e) {
        fail(e.message);
      }
    },
    [closeConnection, endActive],
  );

  const start = useCallback(
    async (profile) => {
      stopSearching();
      closeConnection();
      endActive();
      const thisAttempt = (attempt.current += 1);
      setError('');
      setCallId(null);
      setPartner(null);
      setPartnerUid(null);
      setEndedByPartner(false);
      setPhase('searching');
      try {
        // Ask for the camera first, while we are still inside the tap that started this.
        await ensureMedia();
        if (attempt.current !== thisAttempt) {
          stopLocal(); // cancelled while the permission prompt was open
          return;
        }

        const user = await ensureUser();
        await leaveVideoQueue(user.uid).catch(() => {}); // clear any stale entry
        const blocked = await fetchBlockedIds(user.uid);
        if (attempt.current !== thisAttempt) return;

        await joinVideoQueue(user.uid, profile.nickname || '');
        if (attempt.current !== thisAttempt) {
          leaveVideoQueue(user.uid).catch(() => {});
          return;
        }

        const state = { uid: user.uid };
        search.current = state;
        setUid(user.uid);

        const me = { uid: user.uid };
        const skip = new Set();
        let busy = false;

        state.unsubscribe = watchVideoQueueEntry(user.uid, (entry) => {
          if (entry?.status === 'matched' && entry.callId) {
            stopSearching();
            connect(entry.callId, user.uid, thisAttempt);
          }
        });

        const tick = async () => {
          if (busy || search.current !== state) return;
          busy = true;
          try {
            await findVideoMatch(me, blocked, skip);
          } catch (e) {
            console.warn('Video matchmaking:', e.message);
          } finally {
            busy = false;
          }
        };
        state.matchTimer = setInterval(tick, MATCH_EVERY_MS);
        state.beatTimer = setInterval(
          () => heartbeatVideoQueue(user.uid).catch(() => {}),
          HEARTBEAT_MS,
        );
        tick();
      } catch (e) {
        if (attempt.current !== thisAttempt) return;
        console.error('Start video chat failed:', e);
        stopLocal();
        setError(mediaErrorMessage(e));
        setPhase('idle');
      }
    },
    [closeConnection, connect, endActive, ensureMedia, stopLocal, stopSearching],
  );

  const reset = useCallback(() => {
    attempt.current += 1;
    stopSearching();
    closeConnection();
    endActive();
    stopLocal();
    setCallId(null);
    setPartner(null);
    setPartnerUid(null);
    setEndedByPartner(false);
    setPhase('idle');
  }, [closeConnection, endActive, stopLocal, stopSearching]);

  const toggleMic = useCallback(() => {
    const next = !micOn;
    local.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const next = !camOn;
    local.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCamOn(next);
  }, [camOn]);

  // A video call can't survive a reload, so closing or reloading the tab ends it.
  useEffect(() => {
    const onPageHide = () => {
      stopSearching();
      endActive();
      stopLocal();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      stopSearching();
      closeConnection();
      endActive();
      stopLocal();
    };
  }, [closeConnection, endActive, stopLocal, stopSearching]);

  return {
    phase,
    callId,
    uid,
    partner,
    partnerUid,
    error,
    localStream,
    remoteStream,
    micOn,
    camOn,
    endedByPartner,
    start,
    next: start,
    cancel: reset,
    reset,
    toggleMic,
    toggleCam,
  };
}