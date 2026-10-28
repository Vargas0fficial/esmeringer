import { useEffect, useState } from 'react';

const SHOW_MS = 2800; // long enough to see the name being written
const SHORT_MS = 600; // for people who prefer reduced motion
const FADE_MS = 500;

/** 'showing' -> 'leaving' (fading) -> 'done'. Waits for the page and fonts too, never less than SHOW_MS. */
export function useSplash() {
  const [phase, setPhase] = useState('showing');

  useEffect(() => {
    let cancelled = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const minimumTime = new Promise((resolve) => setTimeout(resolve, reduced ? SHORT_MS : SHOW_MS));
    const pageLoaded =
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    Promise.all([minimumTime, pageLoaded, fontsReady]).then(() => {
      if (cancelled) return;
      setPhase('leaving');
      setTimeout(() => !cancelled && setPhase('done'), FADE_MS);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return phase;
}