const PASSWORD_KEY = 'projects-manager-app-password-v1';
const UNLOCK_KEY = 'projects-manager-app-unlocked-v1';
const ITERATIONS = 150_000;

interface StoredPassword {
  version: 1;
  iterations: number;
  salt: string;
  hash: string;
  createdAt: string;
}

function toBase64(bytes: Uint8Array) {
  let value = '';
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return btoa(value);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveHash(password: string, salt: Uint8Array, iterations: number) {
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations,
    },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function getStoredPassword() {
  const raw = localStorage.getItem(PASSWORD_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredPassword;
  } catch {
    return null;
  }
}

export function hasAppPassword() {
  return getStoredPassword() !== null;
}

export function isAppUnlocked() {
  return sessionStorage.getItem(UNLOCK_KEY) === 'true';
}

export function setAppUnlocked(value: boolean) {
  if (value) sessionStorage.setItem(UNLOCK_KEY, 'true');
  else sessionStorage.removeItem(UNLOCK_KEY);
}

export async function saveAppPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(password, salt, ITERATIONS);
  const payload: StoredPassword = {
    version: 1,
    iterations: ITERATIONS,
    salt: toBase64(salt),
    hash,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(PASSWORD_KEY, JSON.stringify(payload));
  setAppUnlocked(true);
}

export async function verifyAppPassword(password: string) {
  const stored = getStoredPassword();
  if (!stored) return false;

  const hash = await deriveHash(password, fromBase64(stored.salt), stored.iterations);
  return hash === stored.hash;
}
