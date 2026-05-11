CLAUDE.md — VaultNotes
> Gestionnaire de notes ultra-sécurisé pour développeurs.
> Stack : Electron + React + TypeScript + Tailwind CSS.
> Cryptographie niveau militaire : Argon2id + AES-256-GCM + ChaCha20-Poly1305.
***Contexte & objectif
VaultNotes est une app de bureau macOS (Electron) qui permet à un développeur freelance de stocker de manière sécurisée ses notes de projet : clés API, mots de passe, dépendances, tokens, variables d'environnement. Toutes les données sont chiffrées localement — rien ne quitte jamais la machine.
L'utilisateur principal est un développeur solo qui gère plusieurs projets simultanément (SaaS, sites affiliate, apps mobiles). Il a besoin de retrouver rapidement une clé API ou un mot de passe parmi des dizaines, organisés par projet et par catégorie.
***Stack technique
Couche	Technologie
Shell natif	Electron 30+
UI	React 18 + TypeScript strict
Style	Tailwind CSS v3 + JetBrains Mono (police principale)
Crypto	@noble/ciphers (AES-256-GCM, ChaCha20-Poly1305)
KDF	argon2-browser (Argon2id)
2FA	otplib (TOTP RFC 6238)
QR code	qrcode (setup 2FA)
Config	electron-store (préférences non sensibles uniquement)
Build	electron-builder (target : macOS dmg + zip)
IPC	contextBridge + handlers typés (jamais nodeIntegration: true)
***Architecture des fichiers
vault-notes/
├── CLAUDE.md                        ← ce fichier
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts                   ← pour le renderer React
│
├── electron/                        ← main process Node.js
│   ├── main.ts                      ← BrowserWindow, app lifecycle
│   ├── preload.ts                   ← contextBridge (API sécurisée vers renderer)
│   ├── ipc/
│   │   ├── vault.ipc.ts             ← handlers : open/save/lock vault
│   │   ├── auth.ipc.ts              ← handlers : unlock, setup 2FA, change password
│   │   └── notes.ipc.ts            ← handlers : CRUD notes/projets/catégories
│   └── services/
│       ├── fileStore.ts             ← lecture/écriture fichiers .vault sur disque
│       └── autoLock.ts             ← timer inactivité → lock automatique
│
├── src/                             ← renderer process React
│   ├── main.tsx                     ← point d'entrée React
│   ├── App.tsx                      ← routing entre LockScreen et MainApp
│   │
│   ├── crypto/
│   │   ├── vault.ts                 ← AES-256-GCM encrypt/decrypt
│   │   ├── fileVault.ts             ← ChaCha20-Poly1305 pour export fichiers
│   │   ├── kdf.ts                   ← Argon2id → dérivation masterKey
│   │   └── totp.ts                 ← génération secret TOTP, vérification OTP
│   │
│   ├── store/
│   │   ├── vaultStore.ts            ← état global (Zustand) : projets, notes, UI
│   │   ├── types.ts                 ← types TypeScript stricts
│   │   └── migrations.ts           ← migrations format vault (v1 → v2 etc.)
│   │
│   ├── ui/
│   │   ├── screens/
│   │   │   ├── LockScreen.tsx       ← saisie mot de passe + code 2FA
│   │   │   ├── SetupScreen.tsx      ← création premier vault + setup 2FA
│   │   │   └── MainApp.tsx         ← layout principal (sidebar + éditeur)
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          ← arborescence projets > catégories
│   │   │   ├── NoteEditor.tsx       ← éditeur avec champs typés
│   │   │   ├── NoteCard.tsx         ← affichage note avec copy-to-clipboard
│   │   │   ├── ProjectModal.tsx     ← création/édition projet
│   │   │   ├── CategoryModal.tsx   ← création/édition catégorie
│   │   │   ├── TotpSetupModal.tsx   ← QR code + vérification 2FA
│   │   │   └── SettingsModal.tsx   ← change password, export, auto-lock
│   │   └── hooks/
│   │       ├── useVault.ts          ← open/close vault via IPC
│   │       ├── useClipboard.ts      ← copy + auto-clear après 30s
│   │       └── useAutoLock.ts      ← détection inactivité côté renderer
│   │
│   └── assets/
│       └── icon.png                 ← source icône (converti en .icns par electron-builder)
│
├── assets/
│   ├── icon.icns                    ← icône macOS finale
│   └── icon.png
│
└── dist/                            ← build output (gitignore)
***Modèle de données
Types TypeScript stricts (src/store/types.ts)
// Un vault = un fichier chiffré sur le disque
interface VaultFile {
  version: number              // pour migrations futures
  salt: string                 // base64, 32 bytes — sel Argon2id
  verifyToken: string          // base64 — "VAULT_OK" chiffré, pour valider le mdp
  totpEnabled: boolean
  totpEncryptedSecret: string  // secret TOTP chiffré avec masterKey
  data: string                 // JSON chiffré (AES-256-GCM) contenant VaultData
}
interface VaultData {
  projects: Project[]
  createdAt: number
  updatedAt: number
}
interface Project {
  id: string                   // nanoid
  name: string                 // ex: "FacturNow", "Setup Télétravail"
  icon: string                 // emoji ou nom d'icône Tabler
  color: string                // couleur accent hex
  categories: Category[]
  createdAt: number
  updatedAt: number
}
interface Category {
  id: string
  projectId: string
  name: string                 // ex: "API Keys", "Mots de passe", "Dépendances"
  icon: string
  notes: Note[]
}
type NoteType = 'api_key' | 'password' | 'dependency' | 'env_var' | 'note' | 'url'
interface Note {
  id: string
  categoryId: string
  title: string                // ex: "Stripe Secret Key", "DB Password prod"
  type: NoteType
  content: string              // valeur principale (la clé, le mot de passe...)
  label: string                // ex: "sk_live_...", "STRIPE_SECRET_KEY"
  notes: string                // notes libres additionnelles
  tags: string[]               // ex: ["prod", "stripe", "paiement"]
  favorite: boolean
  createdAt: number
  updatedAt: number
}
***Cryptographie — détail implémentation
Dérivation de la clé maître (src/crypto/kdf.ts)
// Argon2id — paramètres recommandés OWASP 2024
const ARGON2_PARAMS = {
  type: argon2id,
  memory: 65536,    // 64 MB
  iterations: 3,
  parallelism: 4,
  hashLength: 32,   // 256 bits → masterKey AES-256
}
// salt : 32 bytes random, stocké en clair dans VaultFile
// masterKey ne quitte jamais la mémoire, jamais écrit sur disque
Chiffrement des notes (src/crypto/vault.ts)
// AES-256-GCM via @noble/ciphers
// IV : 12 bytes aléatoires, différent à chaque encrypt
// Format binaire : [ IV (12 bytes) | ciphertext | auth tag (16 bytes) ]
// Stocké en base64 dans VaultFile.data
async function encryptVaultData(data: VaultData, masterKey: Uint8Array): Promise<string>
async function decryptVaultData(encrypted: string, masterKey: Uint8Array): Promise<VaultData>
Export fichier (src/crypto/fileVault.ts)
// ChaCha20-Poly1305 via @noble/ciphers
// Pour les exports .vault : algorithme différent de AES pour diversité cryptographique
// Fichier exporté = header JSON (version, algo, salt) + payload chiffré
async function exportVault(data: VaultData, password: string): Promise<Uint8Array>
async function importVault(buffer: Uint8Array, password: string): Promise<VaultData>
2FA TOTP (src/crypto/totp.ts)
// otplib — TOTP RFC 6238
// Secret 20 bytes (160 bits), base32 encodé
// Window de tolérance : ±1 (30s avant/après)
// Le secret TOTP est chiffré avec masterKey avant stockage dans VaultFile
function generateTotpSecret(): string           // génère secret aléatoire
function getTotpUri(secret: string, email: string): string  // pour QR code
function verifyTotp(token: string, secret: string): boolean // vérification code 6 chiffres
***Sécurité — règles non négociables
Ces règles ne doivent JAMAIS être contournées, même pour simplifier le code :
nodeIntegration: false et contextIsolation: true dans toutes les BrowserWindow
La masterKey (Uint8Array 32 bytes) ne doit jamais être sérialisée, loggée, ou transmise via IPC — elle reste dans la mémoire du renderer et est détruite (zéro-fill) au lock
Toutes les communications renderer → main passent par contextBridge avec types stricts
Aucune donnée sensible dans electron-store (réservé aux préférences UI)
Auto-lock après 5 minutes d'inactivité (configurable : 1, 5, 15, 30 min ou jamais)
Le presse-papiers est automatiquement vidé 30 secondes après un copy de valeur sensible
Le vault se verrouille immédiatement si la fenêtre perd le focus (option activable)
Pas de logs en production (console.log retirés au build)
***IPC — API renderer ↔ main
Toutes les fonctions exposées via contextBridge dans preload.ts :
interface VaultAPI {
  // Auth
  setupVault(password: string, totpEnabled: boolean): Promise<{ totpSecret?: string }>
  unlockVault(password: string, totpCode?: string): Promise<boolean>
  lockVault(): Promise<void>
  changePassword(oldPassword: string, newPassword: string): Promise<boolean>
  setupTotp(): Promise<{ secret: string; uri: string }>
  verifyTotpSetup(code: string): Promise<boolean>
  // Données (nécessite vault déverrouillé)
  getProjects(): Promise<Project[]>
  saveProject(project: Project): Promise<void>
  deleteProject(id: string): Promise<void>
  saveCategory(category: Category): Promise<void>
  deleteCategory(id: string): Promise<void>
  saveNote(note: Note): Promise<void>
  deleteNote(id: string): Promise<void>
  // Import / Export
  exportVault(targetPath: string, exportPassword: string): Promise<void>
  importVault(sourcePath: string, importPassword: string): Promise<void>
  // Système
  getVaultPath(): Promise<string>
  onAutoLock(callback: () => void): void
}
***UI — design system
Police : JetBrains Mono pour tout (monospace assumé, look terminal)
Thème : dark uniquement, fond #0a0b0d, accents verts #00ff88 / #00cc6a
Sidebar gauche : arborescence projets > catégories, collapsible, icônes emoji
Éditeur droit : champs typés selon NoteType (pas un textarea générique)
Chaque type de note a un affichage adapté :
api_key / password : champ masqué par défaut + bouton copy + bouton reveal
dependency : nom du package + version + commande install
env_var : KEY + VALUE, affichage KEY=VALUE
url : lien cliquable + copy
note : textarea libre
Recherche globale : Cmd+K → modal avec recherche full-text sur titres + tags
Favoris : Cmd+D pour épingler, section "Favoris" en haut de sidebar
Raccourcis clavier : Cmd+L = lock, Cmd+N = nouvelle note, Cmd+, = settings
***Commandes de développement
# Installer les dépendances
npm install
# Développement (hot reload)
npm run dev
# Build macOS
npm run build:mac
# Vérification TypeScript
npm run typecheck
# Lint
npm run lint
***Fichier vault sur disque
Chemin : ~/Library/Application Support/VaultNotes/vault.vlt
Format : JSON (structure VaultFile) — lisible en tant que texte mais entièrement chiffré
Extension : .vlt (custom, associée à l'app dans Info.plist)
Les exports manuels utilisent l'extension .vault et ChaCha20-Poly1305
***Priorités de développement
Crypto core : kdf.ts, vault.ts, totp.ts — doit être parfait avant tout le reste
IPC sécurisé : preload.ts + handlers IPC avec types stricts
Auth flow : SetupScreen (premier lancement) + LockScreen (unlock normal)
Données CRUD : projets, catégories, notes via Zustand
UI complète : sidebar + éditeur + modals
Polish : raccourcis clavier, auto-lock, export/import, icône macOS
***Ce que Claude Code NE doit PAS faire
Ne pas utiliser crypto du navigateur pour Argon2 (pas supporté) — utiliser argon2-browser
Ne pas utiliser localStorage ou sessionStorage pour des données sensibles
Ne pas simplifier la crypto "pour aller plus vite" (pas de MD5, SHA1, AES-128, ECB)
Ne pas activer nodeIntegration: true même temporairement
Ne pas logger de données sensibles même en dev
Ne pas utiliser eval() ou Function() dans le renderer (CSP stricte)