// ─── Types de données du vault ───────────────────────────────────────────────

export type NoteType = 'api_key' | 'password' | 'note' | 'dependency'

export interface Note {
  id: string
  title: string
  content: string        // Chiffré en AES-256-GCM dans le vault
  type: NoteType
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  notes: Note[]
}

export interface Project {
  id: string
  name: string
  description?: string
  categories: Category[]
  createdAt: string
  updatedAt: string
}

// Données déchiffrées en mémoire
export interface VaultData {
  projects: Project[]
  createdAt: string
  updatedAt: string
}

// ─── Types de fichier .vault ──────────────────────────────────────────────────

export interface EncryptedPayload {
  iv: string           // 12 bytes base64 (GCM nonce)
  ciphertext: string   // base64
  tag: string          // 16 bytes base64 (GCM auth tag)
}

export interface TOTPConfig {
  enabled: boolean
  // Secret chiffré avec la clé dérivée du mot de passe maître
  encryptedSecret: EncryptedPayload | null
}

export interface Argon2Params {
  m: number   // memoryCost en KB (65536 = 64 MB)
  t: number   // timeCost (itérations)
  p: number   // parallelism
}

// Structure du fichier .vault sur le disque
export interface VaultFile {
  version: string
  salt: string           // 32 bytes base64 (sel Argon2id)
  argon2Params: Argon2Params
  totp: TOTPConfig
  data: EncryptedPayload // VaultData JSON chiffré
}
