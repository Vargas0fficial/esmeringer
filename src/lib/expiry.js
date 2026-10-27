import { Timestamp } from 'firebase/firestore';

export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;

/** Value for an `expireAt` field. Set a Firestore TTL policy on it to auto-delete old docs. */
export const expiresIn = (ms) => Timestamp.fromMillis(Date.now() + ms);
