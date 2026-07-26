# Messaging - End-to-End Encryption

## Status: Completed (pragmatic)
## Priority: Medium

## What Was Done
- ECDH P-256 + AES-GCM client helpers (`src/utils/e2eCrypto.ts`)
- `POST/GET /api/crypto/keys`
- Messages store `ciphertext` + `is_encrypted`
- Auto-encrypt when peer has published a key; decrypt on load
- Lock placeholder when decrypt fails

## Notes
- Not Signal Protocol; private keys in localStorage
- Historical plaintext messages remain readable
