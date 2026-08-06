const DEVICE_SECRET_KEY = 'workout-card-game:anonymous-device-secret:v1';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateAnonymousDeviceSecret(): string {
  const existing = localStorage.getItem(DEVICE_SECRET_KEY);
  if (existing && /^[0-9a-f]{64}$/.test(existing)) return existing;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const secret = bytesToHex(bytes);
  localStorage.setItem(DEVICE_SECRET_KEY, secret);
  return secret;
}

export async function getAnonymousDeviceHash(): Promise<string> {
  const secret = getOrCreateAnonymousDeviceSecret();
  const encoded = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}
