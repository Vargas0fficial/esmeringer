import { useState } from 'react';
import { ANYWHERE } from '../config/constants';
import { usePersistentState } from './usePersistentState';

const DEFAULTS = { gender: '', location: ANYWHERE, topics: [], adult: false };

/**
 * Options on the start screen. Gender, location, topics and the 18+ confirmation are remembered
 * on this device; the nickname is temporary and starts empty every visit.
 */
export function useChatSetup() {
  const [saved, setSaved] = usePersistentState('esmering:chat-setup', DEFAULTS);
  const [nickname, setNickname] = useState('');

  const update = (patch) => setSaved((prev) => ({ ...prev, ...patch }));

  return {
    setup: { ...saved, nickname: nickname.trim() },
    nicknameDraft: nickname,
    setNickname,
    update,
  };
}
