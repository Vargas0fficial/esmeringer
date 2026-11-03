const STUN = { urls: 'stun:stun.relay.metered.ca:80' };
const GOOGLE_STUN = { urls: 'stun:stun.l.google.com:19302' };

/** STUN + Metered TURN. Falls back to STUN only if the TURN credentials aren't set. */
export async function getIceServers() {
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (!username || !credential) return [STUN, GOOGLE_STUN];

  return [
    STUN,
    GOOGLE_STUN,
    { urls: 'turn:global.relay.metered.ca:80', username, credential },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username, credential },
    { urls: 'turn:global.relay.metered.ca:443', username, credential },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username, credential },
  ];
}