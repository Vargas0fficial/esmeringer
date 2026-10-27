import { useEffect, useState } from 'react';
import { watchSession } from '../services/authService';

/** The visitor's anonymous Firebase user, or null while connecting / not configured. */
export function useSession() {
  const [user, setUser] = useState(null);
  useEffect(() => watchSession(setUser), []);
  return user;
}
