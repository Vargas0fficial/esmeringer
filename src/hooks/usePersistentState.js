import { useEffect, useState } from 'react';

/** useState that survives page reloads via localStorage. */
export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? { ...initialValue, ...JSON.parse(stored) } : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage can be unavailable (private mode) — ignore */
    }
  }, [key, value]);

  return [value, setValue];
}
