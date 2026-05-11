import { chacha20poly1305 } from '@noble/ciphers/chacha'
import { randomBytes } from '@noble/ciphers/webcrypto'
import { deriveKey, generateSalt } from './kdf'
import type { VaultData } from '@/types/vault.types'

// ─── ChaCha20-Poly1305 — exports .vault ───────────────────────────────────────
// Algorithme délibérément différent d'AES-GCM pour diversité cryptographique.
// Utilisé uniquement pour les exports manuels (backup portable).
// La clé est dérivée d'un MOT DE PASSE D'EXPORT (différent du mot de passe maître).
//
// Format du fichier exporté :
//   { version, algo, salt (base64), nonce (base64), ciphertext (base64) }

const EXPORT_VERSION = 1
const EXPORT_ALGO = 'chacha20-poly1305'

interface ExportFileFormat {
  version: number
  algo: string
  salt: string      // 32 bytes base64 — sel Argon2id de la clé d'export
  nonce: string     // 12 bytes base64
  ciphertext: string
}

/**
 * Exporte le vault en fichier chiffré ChaCha20-Poly1305.
 * Un mot de passe dédié à l'export est utilisé (pas le mot de passe maître).
 * Retourne le contenu JSON du fichier d'export.
 */
export async function exportVault(data: VaultData, exportPassword: string): Promise<string> {
  const salt = generateSalt()
  const key = await deriveKey(exportPassword, salt)

  const json = JSON.stringify(data)
  const plaintext = new TextEncoder().encode(json)

  const nonce = randomBytes(12)
  const cipher = chacha20poly1305(key, nonce)
  const ciphertext = cipher.encrypt(plaintext)

  const exportFile: ExportFileFormat = {
    version: EXPORT_VERSION,
    algo: EXPORT_ALGO,
    salt: btoa(String.fromCharCode(...salt)),
    nonce: btoa(String.fromCharCode(...nonce)),
    ciphertext: btoa(String.fromCharCode(...ciphertext)),
  }

  return JSON.stringify(exportFile, null, 2)
}

/**
 * Importe et déchiffre un fichier d'export .vault.
 * Lance une erreur si le mot de passe d'export est incorrect.
 */
export async function importVault(fileContent: string, exportPassword: string): Promise<VaultData> {
  const file: ExportFileFormat = JSON.parse(fileContent)

  if (file.version !== EXPORT_VERSION || file.algo !== EXPORT_ALGO) {
    throw new Error('Format de fichier vault non supporté')
  }

  const salt = Uint8Array.from(atob(file.salt), c => c.charCodeAt(0))
  const key = await deriveKey(exportPassword, salt)

  const nonce = Uint8Array.from(atob(file.nonce), c => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(file.ciphertext), c => c.charCodeAt(0))

  // chacha20poly1305 intègre le tag Poly1305 — lève une erreur si invalide
  const decipher = chacha20poly1305(key, nonce)
  const plaintext = decipher.decrypt(ciphertext)

  return JSON.parse(new TextDecoder().decode(plaintext)) as VaultData
}
