/**
 * Pragmatic E2E helpers (ECDH P-256 + AES-GCM).
 * Private key stays in localStorage; only public keys hit the server.
 */

const PRIV_KEY = 'puurga_e2e_private_jwk';
const PUB_KEY = 'puurga_e2e_public_jwk';

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

export async function ensureE2EKeyPair(): Promise<{ publicKeyJwk: JsonWebKey }> {
  const existingPub = localStorage.getItem(PUB_KEY);
  const existingPriv = localStorage.getItem(PRIV_KEY);
  if (existingPub && existingPriv) {
    return { publicKeyJwk: JSON.parse(existingPub) };
  }

  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  localStorage.setItem(PUB_KEY, JSON.stringify(publicKeyJwk));
  localStorage.setItem(PRIV_KEY, JSON.stringify(privateKeyJwk));
  return { publicKeyJwk };
}

async function importPrivateKey(): Promise<CryptoKey | null> {
  const raw = localStorage.getItem(PRIV_KEY);
  if (!raw) return null;
  return crypto.subtle.importKey(
    'jwk',
    JSON.parse(raw),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );
}

async function importPeerPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}

async function deriveAesKey(peerPublicJwk: JsonWebKey): Promise<CryptoKey | null> {
  const priv = await importPrivateKey();
  if (!priv) return null;
  const peer = await importPeerPublicKey(peerPublicJwk);
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peer },
    priv,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(
  plaintext: string,
  peerPublicJwk: JsonWebKey
): Promise<{ ciphertext: string; iv: string } | null> {
  const key = await deriveAesKey(peerPublicJwk);
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { ciphertext: bufToB64(cipherBuf), iv: bufToB64(iv.buffer) };
}

export async function decryptMessage(
  ciphertextB64: string,
  ivB64: string,
  peerPublicJwk: JsonWebKey
): Promise<string | null> {
  try {
    const key = await deriveAesKey(peerPublicJwk);
    if (!key) return null;
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(ivB64)) },
      key,
      b64ToBuf(ciphertextB64)
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}

/** Pack ciphertext+iv into a single transport string */
export function packCipher(ciphertext: string, iv: string): string {
  return `e2e:${iv}:${ciphertext}`;
}

export function unpackCipher(packed: string): { iv: string; ciphertext: string } | null {
  if (!packed?.startsWith('e2e:')) return null;
  const parts = packed.split(':');
  if (parts.length < 3) return null;
  return { iv: parts[1], ciphertext: parts.slice(2).join(':') };
}

export function hasLocalE2EKeys(): boolean {
  return !!(localStorage.getItem(PRIV_KEY) && localStorage.getItem(PUB_KEY));
}
