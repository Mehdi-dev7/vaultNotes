import { gcm } from '@noble/ciphers/aes'
import { randomBytes } from '@noble/ciphers/webcrypto'
import type { VaultData, VaultFile } from '@/types/vault.types'

// ─── AES-256-GCM via @noble/ciphers ──────────────────────────────────────────
// Format interne : [ IV 12 bytes | ciphertext | auth tag 16 bytes ]
// @noble/ciphers intègre le tag à la fin du ciphertext automatiquement.
// Tout le chiffrement se fait dans le renderer — la masterKey ne quitte pas.

const VERIFY_PLAINTEXT = 'VAULT_OK_V1'  // token connu pour vérifier le mot de passe

// ─── Primitives bas niveau ────────────────────────────────────────────────────

function encryptRaw(plaintext: Uint8Array, key: Uint8Array): string {
  const iv = randomBytes(12)
  const cipher = gcm(key, iv)
  const ciphertext = cipher.encrypt(plaintext)
  // Concatène IV + ciphertext (qui contient déjà le tag Poly1305)
  const result = new Uint8Array(12 + ciphertext.length)
  result.set(iv, 0)
  result.set(ciphertext, 12)
  return btoa(String.fromCharCode(...result))
}

function decryptRaw(base64: string, key: Uint8Array): Uint8Array {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const iv = bytes.slice(0, 12)
  const ciphertext = bytes.slice(12)
  const decipher = gcm(key, iv)
  return decipher.decrypt(ciphertext)
}

// ─── API publique ─────────────────────────────────────────────────────────────

/** Chiffre le JSON du VaultData en base64 AES-256-GCM. */
export function encryptVaultData(data: VaultData, key: Uint8Array): string {
  const json = JSON.stringify(data)
  const encoded = new TextEncoder().encode(json)
  return encryptRaw(encoded, key)
}

/** Déchiffre le VaultData. Lève une erreur si la clé est incorrecte. */
export function decryptVaultData(encrypted: string, key: Uint8Array): VaultData {
  const bytes = decryptRaw(encrypted, key)
  const json = new TextDecoder().decode(bytes)
  return JSON.parse(json) as VaultData
}

/**
 * Génère le verifyToken : chiffre VERIFY_PLAINTEXT avec la masterKey.
 * Permet de vérifier le mot de passe rapidement sans déchiffrer tout le vault.
 */
export function createVerifyToken(key: Uint8Array): string {
  const encoded = new TextEncoder().encode(VERIFY_PLAINTEXT)
  return encryptRaw(encoded, key)
}

/**
 * Vérifie le token : retourne true si la clé déchiffre correctement.
 * Utilise la vérification d'authenticité GCM — pas de timing attack.
 */
export function verifyToken(token: string, key: Uint8Array): boolean {
  try {
    const bytes = decryptRaw(token, key)
    const text = new TextDecoder().decode(bytes)
    return text === VERIFY_PLAINTEXT
  } catch {
    return false
  }
}

/** Chiffre une string arbitraire (ex: secret TOTP). */
export function encryptString(plaintext: string, key: Uint8Array): string {
  const encoded = new TextEncoder().encode(plaintext)
  return encryptRaw(encoded, key)
}

/** Déchiffre une string chiffrée avec encryptString. */
export function decryptString(encrypted: string, key: Uint8Array): string {
  const bytes = decryptRaw(encrypted, key)
  return new TextDecoder().decode(bytes)
}

/** Chiffre un Uint8Array brut (ex: masterKey) avec une clé AES-256-GCM. */
export function encryptBytes(bytes: Uint8Array, key: Uint8Array): string {
  return encryptRaw(bytes, key)
}

/** Déchiffre un Uint8Array brut chiffré avec encryptBytes. */
export function decryptBytes(encrypted: string, key: Uint8Array): Uint8Array {
  return decryptRaw(encrypted, key)
}

/** Convertit un VaultFile (lu sur disque) en forme sérialisable. */
export function serializeVaultFile(file: VaultFile): string {
  return JSON.stringify(file, null, 2)
}

/** Parse un VaultFile depuis son contenu JSON. */
export function parseVaultFile(content: string): VaultFile {
  return JSON.parse(content) as VaultFile
}

/** Encode un Uint8Array en base64. */
export function uint8ToBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
}

/** Decode un base64 en Uint8Array. */
export function base64ToUint8(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}
