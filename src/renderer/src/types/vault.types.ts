// ─── Types de données — VaultNotes ────────────────────────────────────────────

// 6 types de notes, chacun avec un affichage adapté dans l'éditeur
export type NoteType = 'api_key' | 'password' | 'dependency' | 'env_var' | 'url' | 'note'

export interface Note {
  id: string
  categoryId: string
  title: string         // Nom descriptif : "Stripe Secret Key", "DB Password prod"
  type: NoteType
  content: string       // Valeur principale (la clé, le mot de passe, l'URL…)
  label: string         // Identifiant court : "STRIPE_SECRET_KEY", "sk_live_..."
  notes: string         // Notes libres additionnelles (contexte, infos)
  tags: string[]        // ["prod", "stripe", "paiement"]
  favorite: boolean
  createdAt: number     // Date.now()
  updatedAt: number
}

export interface Category {
  id: string
  projectId: string
  name: string          // "API Keys", "Mots de passe", "Dépendances"
  icon: string          // emoji : "🔑", "🔒", "📦"
  notes: Note[]
}

export interface Project {
  id: string
  name: string          // "FacturNow", "Setup Télétravail", "E-commerce client X"
  icon: string          // emoji ou nom d'icône
  color: string         // couleur accent hex : "#e8820c", "#6366f1"
  categories: Category[]
  createdAt: number
  updatedAt: number
}

export interface VaultData {
  projects: Project[]
  createdAt: number
  updatedAt: number
}

// ─── Format du fichier .vlt sur le disque ─────────────────────────────────────
export interface VaultFile {
  version: number
  salt: string             // base64 — 32 bytes aléatoires (sel Argon2id)
  verifyToken: string      // base64 — "VAULT_OK" chiffré, vérifie le mot de passe
  totpEnabled: boolean
  totpEncryptedSecret: string  // secret TOTP chiffré avec masterKey (base64)
  data: string             // JSON chiffré AES-256-GCM (base64)
}

// ─── Sélection dans l'arborescence ────────────────────────────────────────────
export interface Selection {
  projectId: string | null
  categoryId: string | null
  noteId: string | null
}

// ─── Métadonnées d'affichage ──────────────────────────────────────────────────
export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  api_key:    'API Key',
  password:   'Password',
  dependency: 'Dependency',
  env_var:    'Env Var',
  url:        'URL',
  note:       'Note',
}

export const NOTE_TYPE_ICONS: Record<NoteType, string> = {
  api_key:    '🔑',
  password:   '🔒',
  dependency: '📦',
  env_var:    '⚙️',
  url:        '🔗',
  note:       '📝',
}

export const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  api_key:    '#ffa502',  // orange
  password:   '#ff4757',  // rouge
  dependency: '#a29bfe',  // violet
  env_var:    '#00cec9',  // teal
  url:        '#74b9ff',  // bleu
  note:       '#e8820c',  // orange (accent)
}

// Placeholder du contenu selon le type
export const NOTE_TYPE_PLACEHOLDERS: Record<NoteType, string> = {
  api_key:    'votre-clé-api-ici...',
  password:   'Mot de passe ou credentials...',
  dependency: 'lodash',
  env_var:    'valeur de la variable',
  url:        'https://example.com',
  note:       'Contenu de la note...',
}

// Placeholder du label selon le type
export const NOTE_TYPE_LABEL_PLACEHOLDERS: Record<NoteType, string> = {
  api_key:    'STRIPE_SECRET_KEY',
  password:   'username@host',
  dependency: '^4.17.21',
  env_var:    'DATABASE_URL',
  url:        'Titre ou description',
  note:       '',
}
