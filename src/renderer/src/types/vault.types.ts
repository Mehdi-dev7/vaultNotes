// ─── Types de données — VaultNotes ────────────────────────────────────────────

export type NoteType = 'api_key' | 'password' | 'dependency' | 'env_var' | 'url' | 'note' | 'contact'

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
  name: string             // "API Keys", "Mots de passe", "Dépendances"
  icon: string             // emoji : "🔑", "🔒", "📦"
  notes: Note[]
  defaultNoteType?: NoteType  // type pré-sélectionné à la création d'une note
}

export interface Project {
  id: string
  name: string          // "FacturNow", "Setup Télétravail", "E-commerce client X"
  icon: string
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
  salt: string
  verifyToken: string
  totpEnabled: boolean
  totpEncryptedSecret: string
  data: string
  recoverySalt?: string
  recoveryEncryptedCode?: string
  recoveryEncryptedMasterKey?: string
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
  contact:    'Contact',
}

export const NOTE_TYPE_ICONS: Record<NoteType, string> = {
  api_key:    '🔑',
  password:   '🔒',
  dependency: '📦',
  env_var:    '⚙️',
  url:        '🔗',
  note:       '📝',
  contact:    '👤',
}

export const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  api_key:    '#ffa502',
  password:   '#ff4757',
  dependency: '#a29bfe',
  env_var:    '#00cec9',
  url:        '#74b9ff',
  note:       '#e8820c',
  contact:    '#26de81',
}

export const NOTE_TYPE_PLACEHOLDERS: Record<NoteType, string> = {
  api_key:    'votre-clé-api-ici...',
  password:   'Mot de passe ou credentials...',
  dependency: 'lodash',
  env_var:    'valeur de la variable',
  url:        'https://example.com',
  note:       'Contenu de la note...',
  contact:    'Informations de contact...',
}

export const NOTE_TYPE_LABEL_PLACEHOLDERS: Record<NoteType, string> = {
  api_key:    'STRIPE_SECRET_KEY',
  password:   'username@host',
  dependency: '^4.17.21',
  env_var:    'DATABASE_URL',
  url:        'Titre ou description',
  note:       '',
  contact:    'Entreprise / Rôle',
}

// ─── Templates de création ────────────────────────────────────────────────────

export interface CategoryTemplate {
  icon: string
  name: string
  defaultNoteType: NoteType
}

export interface ProjectTemplate {
  icon: string
  label: string
  description: string
  color: string
  categories: CategoryTemplate[]
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    icon: '📁',
    label: 'Projet libre',
    description: 'Projet vierge, tu ajoutes tes catégories',
    color: '#e8820c',
    categories: [],
  },
  {
    icon: '💻',
    label: 'Projet dev',
    description: 'API keys, env vars, dépendances',
    color: '#6c63ff',
    categories: [
      { icon: '🔑', name: 'API Keys',    defaultNoteType: 'api_key' },
      { icon: '⚙️', name: 'Env Vars',    defaultNoteType: 'env_var' },
      { icon: '📦', name: 'Dépendances', defaultNoteType: 'dependency' },
    ],
  },
  {
    icon: '🔐',
    label: 'Mots de passe',
    description: 'Sites web, apps, réseaux sociaux',
    color: '#ff4757',
    categories: [
      { icon: '🌐', name: 'Sites web',       defaultNoteType: 'password' },
      { icon: '📱', name: 'Applications',    defaultNoteType: 'password' },
      { icon: '💬', name: 'Réseaux sociaux', defaultNoteType: 'password' },
    ],
  },
  {
    icon: '👤',
    label: 'Contacts',
    description: 'Clients, fournisseurs, partenaires',
    color: '#26de81',
    categories: [
      { icon: '🤝', name: 'Clients',      defaultNoteType: 'contact' },
      { icon: '📦', name: 'Fournisseurs', defaultNoteType: 'contact' },
    ],
  },
]

export const CATEGORY_TEMPLATES: Array<{
  icon: string
  name: string
  defaultNoteType: NoteType | null
}> = [
  { icon: '🔑', name: 'API Keys',      defaultNoteType: 'api_key' },
  { icon: '🔒', name: 'Mots de passe', defaultNoteType: 'password' },
  { icon: '🔗', name: 'Liens',         defaultNoteType: 'url' },
  { icon: '📝', name: 'Notes',         defaultNoteType: 'note' },
  { icon: '⚙️', name: 'Env Vars',      defaultNoteType: 'env_var' },
  { icon: '📦', name: 'Dépendances',   defaultNoteType: 'dependency' },
  { icon: '👤', name: 'Contacts',      defaultNoteType: 'contact' },
  { icon: '✏️', name: 'Personnalisée', defaultNoteType: null },
]
