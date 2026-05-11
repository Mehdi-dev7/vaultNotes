import { argon2id } from 'hash-wasm'

// ─── KDF — Argon2id (hash-wasm, WASM, renderer-safe) ─────────────────────────
// La masterKey dérivée ici NE QUITTE JAMAIS la mémoire du renderer.
// Elle n'est jamais sérialisée ni transmise via IPC.
// Paramètres OWASP 2024 : m=64 MB · t=3 · p=4 → ≈1-2s

const ARGON2_PARAMS = {
  memorySize:  65536,   // 64 MB
  iterations:  3,
  parallelism: 4,
  hashLength:  32,      // 32 bytes = 256 bits → taille clé AES-256
  outputType: 'binary' as const,
}

/**
 * Dérive une masterKey Uint8Array[32] depuis le mot de passe + sel.
 * Le résultat est la clé brute AES-256 / ChaCha20.
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const result = await argon2id({ password, salt, ...ARGON2_PARAMS })
  return result as Uint8Array
}

/**
 * Génère un sel aléatoire de 32 bytes (à stocker en clair dans VaultFile).
 * Utilise l'API WebCrypto du renderer (disponible dans Electron).
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

/**
 * Efface un Uint8Array en mémoire (zero-fill).
 * Appelé lors du lock pour détruire la masterKey.
 */
export function zeroFill(buf: Uint8Array): void {
  buf.fill(0)
}
