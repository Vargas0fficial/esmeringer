import { useState } from 'react';
import { ANYWHERE } from '../config/constants';

const DEFAULTS = { gender: '', location: ANYWHERE, topics: [], adult: false };

/**
 * Options on the start screen. Everything resets to its default on every page load:
 * nothing is saved to localStorage.
 */
export function useChatSetup() {
  const [saved, setSaved] = useState(DEFAULTS);
  const [nickname, setNickname] = useState('');

  const update = (patch) => setSaved((prev) => ({ ...prev, ...patch }));

  return {
    setup: { ...saved, nickname: nickname.trim() },
    nicknameDraft: nickname,
    setNickname,
    update,
  };
}