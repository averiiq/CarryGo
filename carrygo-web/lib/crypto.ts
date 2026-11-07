/**
 * Cryptographic Utilities for Secure Identity Hashing (web).
 *
 * MUST produce the same hash as `CarryGo/lib/crypto.ts` so the `aadhaar_hash`
 * / `pan_hash` columns in `kyc_sessions` reconcile across mobile and web.
 * The salt below is the same as the mobile constant — do not change it.
 */

const IDENTITY_SALT = 'carrygo_identity_salt_v1_2026_'

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashAadhaarNumber(aadhaarNumber: string): Promise<string> {
  const clean = aadhaarNumber.replace(/\D/g, '')
  return sha256Hex(`${IDENTITY_SALT}aadhaar_${clean}`)
}

export async function hashPanNumber(panNumber: string): Promise<string> {
  const clean = panNumber.trim().toUpperCase()
  return sha256Hex(`${IDENTITY_SALT}pan_${clean}`)
}
