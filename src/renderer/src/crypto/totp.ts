import { hmac } from '@noble/hashes/hmac.js'
import { sha1 } from '@noble/hashes/legacy.js'
import qrcode from 'qrcode'

// ─── TOTP RFC 6238 — implémentation pure JS (browser-safe) ───────────────────
// @noble/hashes fournit HMAC-SHA1 sans dépendance sur le crypto Node.js.
// Compatible avec Google Authenticator, Authy, Bitwarden Authenticator.

const TOTP_DIGITS = 6
const TOTP_PERIOD = 30     // secondes
const TOTP_WINDOW = 1      // ±1 step de tolérance (±30s)

// ─── Base32 (RFC 4648) ────────────────────────────────────────────────────────
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '')
  const bytes: number[] = []
  let buffer = 0
  let bitsLeft = 0

  for (const char of clean) {
    const val = BASE32_CHARS.indexOf(char)
    if (val === -1) continue
    buffer = (buffer << 5) | val
    bitsLeft += 5
    if (bitsLeft >= 8) {
      bitsLeft -= 8
      bytes.push((buffer >> bitsLeft) & 0xff)
    }
  }
  return new Uint8Array(bytes)
}

function base32Encode(bytes: Uint8Array): string {
  let result = ''
  let buffer = 0
  let bitsLeft = 0

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bitsLeft += 8
    while (bitsLeft >= 5) {
      bitsLeft -= 5
      result += BASE32_CHARS[(buffer >> bitsLeft) & 31]
    }
  }
  if (bitsLeft > 0) {
    result += BASE32_CHARS[(buffer << (5 - bitsLeft)) & 31]
  }
  return result
}

// ─── HOTP (RFC 4226) ──────────────────────────────────────────────────────────
function hotp(key: Uint8Array, counter: bigint): string {
  const counterBytes = new Uint8Array(8)
  const view = new DataView(counterBytes.buffer)
  view.setBigUint64(0, counter, false)  // big-endian

  const mac = hmac(sha1, key, counterBytes)
  const offset = mac[mac.length - 1] & 0x0f
  const otp = (
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3]
  ) % Math.pow(10, TOTP_DIGITS)

  return otp.toString().padStart(TOTP_DIGITS, '0')
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Génère un secret TOTP aléatoire base32 (20 bytes = 160 bits).
 * Utilise crypto.getRandomValues (disponible dans le renderer Electron).
 */
export function generateTotpSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return base32Encode(bytes)
}

/** Génère l'URI otpauth:// pour le QR code. */
export function getTotpUri(secret: string, account: string): string {
  return `otpauth://totp/VaultNotes:${encodeURIComponent(account)}?secret=${secret}&issuer=VaultNotes&algorithm=SHA1&digits=6&period=30`
}

/** Génère le QR code en data URL base64. */
export async function generateTotpQR(secret: string, account: string): Promise<string> {
  const uri = getTotpUri(secret, account)
  return qrcode.toDataURL(uri, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark: '#e8820c', light: '#0a0b0d' },
  })
}

/**
 * Vérifie un code TOTP à 6 chiffres dans une fenêtre de ±1 step.
 */
export function verifyTotp(token: string, secret: string): boolean {
  const key = base32Decode(secret)
  const cleanToken = token.replace(/\s/g, '')
  const currentStep = BigInt(Math.floor(Date.now() / 1000 / TOTP_PERIOD))

  for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
    if (hotp(key, currentStep + BigInt(delta)) === cleanToken) return true
  }
  return false
}

/** Génère le code courant (pour les tests). */
export function getCurrentToken(secret: string): string {
  const key = base32Decode(secret)
  const step = BigInt(Math.floor(Date.now() / 1000 / TOTP_PERIOD))
  return hotp(key, step)
}
