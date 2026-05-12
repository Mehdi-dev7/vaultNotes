import { useMemo } from 'react'
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { deriveKey, generateSalt, zeroFill } from '@/crypto/kdf'
import {
  encryptVaultData, decryptVaultData, createVerifyToken, verifyToken,
  encryptString, decryptString, encryptBytes, decryptBytes,
  serializeVaultFile, parseVaultFile,
  uint8ToBase64, base64ToUint8,
} from '@/crypto/vault'
import { verifyTotp, generateTotpSecret, generateTotpQR } from '@/crypto/totp'
import { exportVault as exportVaultFile, importVault as importVaultFile } from '@/crypto/fileVault'
import type {
  VaultData, VaultFile, Project, Category, Note, NoteType, Selection,
} from '@/types/vault.types'

// ─── App Store ────────────────────────────────────────────────────────────────
// Contient la masterKey en mémoire (Uint8Array, zero-fill au lock).
// Gère tout le cycle de vie du vault : create → unlock → CRUD → lock.

const VAULT_VERSION = 1

interface AppState {
  // ── Auth & crypto ──────────────────────────────────────────────────────────
  isUnlocked: boolean
  vaultExists: boolean | null
  masterKey: Uint8Array | null   // Zero-fillé au lock — NE JAMAIS sérialiser
  vaultFile: VaultFile | null    // Métadonnées du fichier (chiffrées)
  isTOTPEnabled: boolean

  // ── Données déchiffrées ────────────────────────────────────────────────────
  vaultData: VaultData | null

  // ── Sélection UI ──────────────────────────────────────────────────────────
  selection: Selection
  editingNoteId: string | null

  // ── Modales ────────────────────────────────────────────────────────────────
  showSearch: boolean
  showSettings: boolean
  showTOTPSetup: boolean

  // ── Recovery ──────────────────────────────────────────────────────────────
  pendingRecoveryCode: string | null  // code affiché une seule fois après création

  // ── Opérations async ──────────────────────────────────────────────────────
  isLoading: boolean

  // ── Actions ───────────────────────────────────────────────────────────────
  checkVaultExists: () => Promise<void>

  /** Premier lancement : crée le vault chiffré sur le disque. */
  setupVault: (password: string, totpEnabled: boolean) => Promise<{ totpSecret?: string; error?: string }>

  /** Déverrouille le vault : dérive la clé, vérifie le token, charge les données. */
  unlockVault: (password: string, totpCode?: string) => Promise<boolean>

  /** Verrouille : zero-fill masterKey, vide les données en mémoire. */
  lockVault: () => void

  /** Change le mot de passe maître (re-dérive la clé, re-chiffre tout). */
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>

  /** Active le TOTP après vérification du code. */
  setupTotp: () => Promise<{ secret: string; qrCode: string }>
  verifyTotpSetup: (code: string, secret: string) => Promise<boolean>
  disableTotp: () => Promise<void>

  /** Vérifie un code de récupération sans modifier l'état (validation UX). */
  validateRecoveryCode: (code: string) => Promise<boolean>

  /** Réinitialise le mot de passe via le code de récupération (après perte du mdp). */
  resetPasswordViaRecovery: (recoveryCode: string, newPassword: string) => Promise<boolean>

  /** Efface le code de récup affiché après création (utilisateur l'a sauvegardé). */
  clearPendingRecoveryCode: () => void

  /** Export chiffré ChaCha20-Poly1305. */
  exportVault: (exportPassword: string) => Promise<void>

  /** Import depuis un fichier .vault. */
  importVault: (importPassword: string) => Promise<boolean>

  // ── CRUD ──────────────────────────────────────────────────────────────────
  createProject: (name: string, icon?: string, color?: string, templateCategories?: Array<{ name: string; icon: string; defaultNoteType?: NoteType }>) => Promise<Project>
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'icon' | 'color'>>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  createCategory: (projectId: string, name: string, icon?: string, defaultNoteType?: NoteType) => Promise<Category>
  updateCategory: (projectId: string, categoryId: string, updates: Partial<Pick<Category, 'name' | 'icon'>>) => Promise<void>
  deleteCategory: (projectId: string, categoryId: string) => Promise<void>

  createNote: (projectId: string, categoryId: string, data: Omit<Note, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>) => Promise<Note>
  updateNote: (projectId: string, categoryId: string, noteId: string, updates: Partial<Omit<Note, 'id' | 'categoryId' | 'createdAt'>>) => Promise<void>
  deleteNote: (projectId: string, categoryId: string, noteId: string) => Promise<void>
  toggleFavorite: (projectId: string, categoryId: string, noteId: string) => Promise<void>

  // ── UI ────────────────────────────────────────────────────────────────────
  selectProject: (id: string) => void
  selectCategory: (projectId: string, categoryId: string) => void
  selectNote: (projectId: string, categoryId: string, noteId: string) => void
  clearSelection: () => void
  setEditingNote: (id: string | null) => void
  setShowSearch: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  setShowTOTPSetup: (show: boolean) => void
  setLoading: (loading: boolean) => void
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

// Génère un code de récupération au format XXXX-XXXX-XXXX-XXXX-XXXX
// Base32 Crockford (sans 0/O, 1/I/L) → ~99 bits d'entropie
function generateRecoveryCode(): string {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  let result = ''
  for (let i = 0; i < 20; i++) {
    if (i > 0 && i % 4 === 0) result += '-'
    result += CHARS[bytes[i] % CHARS.length]
  }
  return result
}

// Normalise le code saisi par l'utilisateur (tirets, espaces, casse)
function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[-\s]/g, '')
}

async function persistVaultFile(file: VaultFile): Promise<void> {
  const result = await window.vault.writeVault(serializeVaultFile(file))
  if (result.ok === false) throw new Error(result.error)
}

async function persistVaultData(data: VaultData, file: VaultFile, key: Uint8Array): Promise<VaultFile> {
  const newFile: VaultFile = {
    ...file,
    data: encryptVaultData(data, key),
  }
  await persistVaultFile(newFile)
  return newFile
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  isUnlocked: false,
  vaultExists: null,
  masterKey: null,
  vaultFile: null,
  vaultData: null,
  isTOTPEnabled: false,
  selection: { projectId: null, categoryId: null, noteId: null },
  editingNoteId: null,
  showSearch: false,
  showSettings: false,
  showTOTPSetup: false,
  isLoading: false,
  pendingRecoveryCode: null,

  checkVaultExists: async () => {
    const result = await window.vault.vaultExists()
    if (result.ok) set({ vaultExists: result.data })
  },

  setupVault: async (password, totpEnabled) => {
    set({ isLoading: true })
    try {
      const salt = generateSalt()
      const key = await deriveKey(password, salt)

      let totpSecret: string | undefined
      let totpEncryptedSecret = ''

      if (totpEnabled) {
        totpSecret = generateTotpSecret()
        totpEncryptedSecret = encryptString(totpSecret, key)
      }

      // Génération du code de récupération
      const recoveryCode = generateRecoveryCode()
      const recoverySalt = generateSalt()
      const recoveryKey = await deriveKey(normalizeCode(recoveryCode), recoverySalt)
      const recoveryEncryptedCode = encryptString(recoveryCode, key)
      const recoveryEncryptedMasterKey = encryptBytes(key, recoveryKey)
      zeroFill(recoveryKey)

      const initialData: VaultData = {
        projects: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const vaultFile: VaultFile = {
        version: VAULT_VERSION,
        salt: uint8ToBase64(salt),
        verifyToken: createVerifyToken(key),
        totpEnabled,
        totpEncryptedSecret,
        data: encryptVaultData(initialData, key),
        recoverySalt: uint8ToBase64(recoverySalt),
        recoveryEncryptedCode,
        recoveryEncryptedMasterKey,
      }

      await persistVaultFile(vaultFile)

      set({
        isUnlocked: true,
        vaultExists: true,
        masterKey: key,
        vaultFile,
        vaultData: initialData,
        isTOTPEnabled: totpEnabled,
        isLoading: false,
        pendingRecoveryCode: recoveryCode,
      })

      return { totpSecret, recoveryCode }
    } catch (e) {
      set({ isLoading: false })
      return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
    }
  },

  unlockVault: async (password, totpCode) => {
    set({ isLoading: true })
    try {
      const readResult = await window.vault.readVault()
      if (!readResult.ok) { set({ isLoading: false }); return false }

      const vaultFile = parseVaultFile(readResult.data)
      const salt = base64ToUint8(vaultFile.salt)
      const key = await deriveKey(password, salt)

      // Vérification rapide via verifyToken avant de déchiffrer tout
      if (!verifyToken(vaultFile.verifyToken, key)) {
        zeroFill(key)
        set({ isLoading: false })
        return false
      }

      // Vérifie le TOTP si activé
      if (vaultFile.totpEnabled) {
        if (!totpCode) { zeroFill(key); set({ isLoading: false }); return false }
        const secret = decryptString(vaultFile.totpEncryptedSecret, key)
        if (!verifyTotp(totpCode, secret)) {
          zeroFill(key)
          set({ isLoading: false })
          return false
        }
      }

      const data = decryptVaultData(vaultFile.data, key)

      set({
        isUnlocked: true,
        masterKey: key,
        vaultFile,
        vaultData: data,
        isTOTPEnabled: vaultFile.totpEnabled,
        selection: { projectId: null, categoryId: null, noteId: null },
        isLoading: false,
      })
      return true
    } catch {
      set({ isLoading: false })
      return false
    }
  },

  lockVault: () => {
    const { masterKey } = get()
    if (masterKey) zeroFill(masterKey)   // Efface la clé de la mémoire
    window.vault.notifyLocked()
    set({
      isUnlocked: false,
      masterKey: null,
      vaultFile: null,
      vaultData: null,
      isTOTPEnabled: false,
      editingNoteId: null,
      selection: { projectId: null, categoryId: null, noteId: null },
    })
  },

  changePassword: async (oldPassword, newPassword) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) return false

    try {
      const salt = base64ToUint8(vaultFile.salt)
      const oldKey = await deriveKey(oldPassword, salt)

      if (!verifyToken(vaultFile.verifyToken, oldKey)) {
        zeroFill(oldKey)
        return false
      }
      zeroFill(oldKey)

      // Nouveau sel + nouvelle clé
      const newSalt = generateSalt()
      const newKey = await deriveKey(newPassword, newSalt)

      // Re-chiffre le secret TOTP si présent
      let newTotpEncrypted = ''
      if (vaultFile.totpEnabled && vaultFile.totpEncryptedSecret) {
        const secret = decryptString(vaultFile.totpEncryptedSecret, masterKey)
        newTotpEncrypted = encryptString(secret, newKey)
      }

      // Met à jour les données de recovery : re-chiffre la nouvelle masterKey
      let newRecoverySalt = vaultFile.recoverySalt
      let newRecoveryEncryptedCode = vaultFile.recoveryEncryptedCode
      let newRecoveryEncryptedMasterKey = vaultFile.recoveryEncryptedMasterKey

      if (vaultFile.recoverySalt && vaultFile.recoveryEncryptedCode) {
        const recoveryCode = decryptString(vaultFile.recoveryEncryptedCode, masterKey)
        const recoverySaltBytes = base64ToUint8(vaultFile.recoverySalt)
        const recoveryKey = await deriveKey(normalizeCode(recoveryCode), recoverySaltBytes)
        newRecoveryEncryptedMasterKey = encryptBytes(newKey, recoveryKey)
        newRecoveryEncryptedCode = encryptString(recoveryCode, newKey)
        zeroFill(recoveryKey)
      }

      const newFile: VaultFile = {
        ...vaultFile,
        salt: uint8ToBase64(newSalt),
        verifyToken: createVerifyToken(newKey),
        totpEncryptedSecret: newTotpEncrypted,
        data: encryptVaultData(vaultData, newKey),
        recoverySalt: newRecoverySalt,
        recoveryEncryptedCode: newRecoveryEncryptedCode,
        recoveryEncryptedMasterKey: newRecoveryEncryptedMasterKey,
      }

      await persistVaultFile(newFile)
      zeroFill(masterKey)
      set({ masterKey: newKey, vaultFile: newFile })
      return true
    } catch {
      return false
    }
  },

  setupTotp: async () => {
    const secret = generateTotpSecret()
    const qrCode = await generateTotpQR(secret, 'vault@vaultnotes')
    return { secret, qrCode }
  },

  verifyTotpSetup: async (code, secret) => {
    const { masterKey, vaultFile } = get()
    if (!masterKey || !vaultFile) return false

    if (!verifyTotp(code, secret)) return false

    const newFile: VaultFile = {
      ...vaultFile,
      totpEnabled: true,
      totpEncryptedSecret: encryptString(secret, masterKey),
    }
    await persistVaultFile(newFile)
    set({ vaultFile: newFile, isTOTPEnabled: true })
    return true
  },

  disableTotp: async () => {
    const { vaultFile } = get()
    if (!vaultFile) return
    const newFile: VaultFile = { ...vaultFile, totpEnabled: false, totpEncryptedSecret: '' }
    await persistVaultFile(newFile)
    set({ vaultFile: newFile, isTOTPEnabled: false })
  },

  validateRecoveryCode: async (code) => {
    try {
      const readResult = await window.vault.readVault()
      if (!readResult.ok) return false
      const vaultFile = parseVaultFile(readResult.data)
      if (!vaultFile.recoverySalt || !vaultFile.recoveryEncryptedMasterKey) return false

      const recoverySalt = base64ToUint8(vaultFile.recoverySalt)
      const recoveryKey = await deriveKey(normalizeCode(code), recoverySalt)
      const masterKeyBytes = decryptBytes(vaultFile.recoveryEncryptedMasterKey, recoveryKey)
      const valid = verifyToken(vaultFile.verifyToken, masterKeyBytes)
      zeroFill(masterKeyBytes)
      zeroFill(recoveryKey)
      return valid
    } catch {
      return false
    }
  },

  resetPasswordViaRecovery: async (recoveryCode, newPassword) => {
    set({ isLoading: true })
    try {
      const readResult = await window.vault.readVault()
      if (!readResult.ok) { set({ isLoading: false }); return false }

      const vaultFile = parseVaultFile(readResult.data)
      if (!vaultFile.recoverySalt || !vaultFile.recoveryEncryptedMasterKey) {
        set({ isLoading: false }); return false
      }

      // Récupère la masterKey via le code de récup
      const recoverySalt = base64ToUint8(vaultFile.recoverySalt)
      const recoveryKey = await deriveKey(normalizeCode(recoveryCode), recoverySalt)
      const oldMasterKey = decryptBytes(vaultFile.recoveryEncryptedMasterKey, recoveryKey)
      zeroFill(recoveryKey)

      if (!verifyToken(vaultFile.verifyToken, oldMasterKey)) {
        zeroFill(oldMasterKey); set({ isLoading: false }); return false
      }

      // Déchiffre les données avec l'ancienne masterKey
      const vaultData = decryptVaultData(vaultFile.data, oldMasterKey)

      // Crée une nouvelle masterKey depuis le nouveau mot de passe
      const newSalt = generateSalt()
      const newKey = await deriveKey(newPassword, newSalt)

      // Re-chiffre le TOTP si présent
      let newTotpEncrypted = ''
      if (vaultFile.totpEnabled && vaultFile.totpEncryptedSecret) {
        const secret = decryptString(vaultFile.totpEncryptedSecret, oldMasterKey)
        newTotpEncrypted = encryptString(secret, newKey)
      }

      // Met à jour le recovery avec la nouvelle masterKey
      const newRecoveryKey = await deriveKey(normalizeCode(recoveryCode), recoverySalt)
      const newRecoveryEncryptedMasterKey = encryptBytes(newKey, newRecoveryKey)
      const newRecoveryEncryptedCode = encryptString(recoveryCode, newKey)
      zeroFill(newRecoveryKey)
      zeroFill(oldMasterKey)

      const newFile: VaultFile = {
        ...vaultFile,
        salt: uint8ToBase64(newSalt),
        verifyToken: createVerifyToken(newKey),
        totpEncryptedSecret: newTotpEncrypted,
        data: encryptVaultData(vaultData, newKey),
        recoverySalt: uint8ToBase64(recoverySalt),
        recoveryEncryptedCode: newRecoveryEncryptedCode,
        recoveryEncryptedMasterKey: newRecoveryEncryptedMasterKey,
      }

      await persistVaultFile(newFile)

      set({
        isUnlocked: true,
        masterKey: newKey,
        vaultFile: newFile,
        vaultData,
        isTOTPEnabled: newFile.totpEnabled,
        isLoading: false,
        selection: { projectId: null, categoryId: null, noteId: null },
      })
      return true
    } catch {
      set({ isLoading: false })
      return false
    }
  },

  exportVault: async (exportPassword) => {
    const { vaultData } = get()
    if (!vaultData) return

    const pathResult = await window.vault.showSaveDialog(
      `vaultnotes-backup-${new Date().toISOString().slice(0, 10)}.vault`
    )
    if (!pathResult.ok || !pathResult.data) return

    const encrypted = await exportVaultFile(vaultData, exportPassword)
    await window.vault.writeExport(pathResult.data, encrypted)
  },

  importVault: async (importPassword) => {
    const { masterKey, vaultFile } = get()
    if (!masterKey || !vaultFile) return false

    const pathResult = await window.vault.showOpenDialog()
    if (!pathResult.ok || !pathResult.data) return false

    const contentResult = await window.vault.readImport(pathResult.data)
    if (!contentResult.ok) return false

    try {
      const data = await importVaultFile(contentResult.data, importPassword)
      const newFile = await persistVaultData(data, vaultFile, masterKey)
      set({ vaultData: data, vaultFile: newFile })
      return true
    } catch {
      return false
    }
  },

  // ── Helpers CRUD ──────────────────────────────────────────────────────────

  createProject: async (name, icon = '📁', color = '#e8820c', templateCategories = []) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) throw new Error('Vault verrouillé')

    const categories: Category[] = templateCategories.map(t => ({
      id: uuidv4(),
      projectId: '',  // sera réaffecté ci-dessous
      name: t.name,
      icon: t.icon,
      notes: [],
      defaultNoteType: t.defaultNoteType,
    }))

    const project: Project = {
      id: uuidv4(),
      name, icon, color,
      categories: categories.map(c => ({ ...c, projectId: '' })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    // Affecte le vrai projectId aux catégories
    project.categories = categories.map(c => ({ ...c, projectId: project.id }))

    const newData = { ...vaultData, projects: [...vaultData.projects, project], updatedAt: Date.now() }
    const newFile = await persistVaultData(newData, vaultFile, masterKey)
    set({ vaultData: newData, vaultFile: newFile })
    return project
  },

  updateProject: async (id, updates) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) return

    const newData = {
      ...vaultData,
      projects: vaultData.projects.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
      updatedAt: Date.now(),
    }
    const newFile = await persistVaultData(newData, vaultFile, masterKey)
    set({ vaultData: newData, vaultFile: newFile })
  },

  deleteProject: async (id) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) return

    const newData = {
      ...vaultData,
      projects: vaultData.projects.filter(p => p.id !== id),
      updatedAt: Date.now(),
    }
    const newFile = await persistVaultData(newData, vaultFile, masterKey)
    set({ vaultData: newData, vaultFile: newFile, selection: { projectId: null, categoryId: null, noteId: null } })
  },

  createCategory: async (projectId, name, icon = '📂', defaultNoteType?) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) throw new Error('Vault verrouillé')

    const category: Category = { id: uuidv4(), projectId, name, icon, notes: [], defaultNoteType }
    const newData = {
      ...vaultData,
      projects: vaultData.projects.map(p =>
        p.id === projectId
          ? { ...p, categories: [...p.categories, category], updatedAt: Date.now() }
          : p
      ),
      updatedAt: Date.now(),
    }
    const newFile = await persistVaultData(newData, vaultFile, masterKey)
    set({ vaultData: newData, vaultFile: newFile })
    return category
  },

  updateCategory: async (projectId, categoryId, updates) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) return

    const newData = {
      ...vaultData,
      projects: vaultData.projects.map(p =>
        p.id === projectId
          ? {
              ...p,
              categories: p.categories.map(c =>
                c.id === categoryId ? { ...c, ...updates } : c
              ),
              updatedAt: Date.now(),
            }
          : p
      ),
      updatedAt: Date.now(),
    }
    const newFile = await persistVaultData(newData, vaultFile, masterKey)
    set({ vaultData: newData, vaultFile: newFile })
  },

  deleteCategory: async (projectId, categoryId) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) return

    const newData = {
      ...vaultData,
      projects: vaultData.projects.map(p =>
        p.id === projectId
          ? { ...p, categories: p.categories.filter(c => c.id !== categoryId), updatedAt: Date.now() }
          : p
      ),
      updatedAt: Date.now(),
    }
    const newFile = await persistVaultData(newData, vaultFile, masterKey)
    set({ vaultData: newData, vaultFile: newFile, selection: { projectId, categoryId: null, noteId: null } })
  },

  createNote: async (projectId, categoryId, data) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) throw new Error('Vault verrouillé')

    const note: Note = {
      id: uuidv4(),
      categoryId,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const newData = {
      ...vaultData,
      projects: vaultData.projects.map(p =>
        p.id === projectId ? {
          ...p,
          categories: p.categories.map(c =>
            c.id === categoryId ? { ...c, notes: [...c.notes, note] } : c
          ),
          updatedAt: Date.now(),
        } : p
      ),
      updatedAt: Date.now(),
    }
    const newFile = await persistVaultData(newData, vaultFile, masterKey)
    set({ vaultData: newData, vaultFile: newFile })
    return note
  },

  updateNote: async (projectId, categoryId, noteId, updates) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) return

    const newData = {
      ...vaultData,
      projects: vaultData.projects.map(p =>
        p.id === projectId ? {
          ...p,
          categories: p.categories.map(c =>
            c.id === categoryId ? {
              ...c,
              notes: c.notes.map(n =>
                n.id === noteId ? { ...n, ...updates, updatedAt: Date.now() } : n
              )
            } : c
          )
        } : p
      ),
      updatedAt: Date.now(),
    }
    const newFile = await persistVaultData(newData, vaultFile, masterKey)
    set({ vaultData: newData, vaultFile: newFile, editingNoteId: null })
  },

  deleteNote: async (projectId, categoryId, noteId) => {
    const { masterKey, vaultFile, vaultData } = get()
    if (!masterKey || !vaultFile || !vaultData) return

    const newData = {
      ...vaultData,
      projects: vaultData.projects.map(p =>
        p.id === projectId ? {
          ...p,
          categories: p.categories.map(c =>
            c.id === categoryId ? { ...c, notes: c.notes.filter(n => n.id !== noteId) } : c
          )
        } : p
      ),
      updatedAt: Date.now(),
    }
    const newFile = await persistVaultData(newData, vaultFile, masterKey)
    set({ vaultData: newData, vaultFile: newFile, selection: { projectId, categoryId, noteId: null }, editingNoteId: null })
  },

  toggleFavorite: async (projectId, categoryId, noteId) => {
    const { vaultData } = get()
    const note = vaultData?.projects
      .find(p => p.id === projectId)?.categories
      .find(c => c.id === categoryId)?.notes
      .find(n => n.id === noteId)
    if (!note) return
    await get().updateNote(projectId, categoryId, noteId, { favorite: !note.favorite })
  },

  // ── UI ────────────────────────────────────────────────────────────────────
  selectProject: (id) => set({ selection: { projectId: id, categoryId: null, noteId: null }, editingNoteId: null }),
  selectCategory: (projectId, categoryId) => set({ selection: { projectId, categoryId, noteId: null }, editingNoteId: null }),
  selectNote: (projectId, categoryId, noteId) => set({ selection: { projectId, categoryId, noteId }, editingNoteId: null }),
  clearSelection: () => set({ selection: { projectId: null, categoryId: null, noteId: null }, editingNoteId: null }),
  setEditingNote: (id) => set({ editingNoteId: id }),
  setShowSearch: (show) => set({ showSearch: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowTOTPSetup: (show) => set({ showTOTPSetup: show }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearPendingRecoveryCode: () => set({ pendingRecoveryCode: null }),
}))

// ─── Sélecteurs dérivés ───────────────────────────────────────────────────────

export const useSelectedProject = () =>
  useAppStore(s => s.vaultData?.projects.find(p => p.id === s.selection.projectId) ?? null)

export const useSelectedCategory = () =>
  useAppStore(s => {
    const p = s.vaultData?.projects.find(p => p.id === s.selection.projectId)
    return p?.categories.find(c => c.id === s.selection.categoryId) ?? null
  })

export const useSelectedNote = () =>
  useAppStore(s => {
    const p = s.vaultData?.projects.find(p => p.id === s.selection.projectId)
    const c = p?.categories.find(c => c.id === s.selection.categoryId)
    return c?.notes.find(n => n.id === s.selection.noteId) ?? null
  })

// Note : utilisez useMemo dans le composant plutôt que ce sélecteur
// pour éviter la création de nouveaux tableaux à chaque render Zustand.
export const useFavoriteNotes = () => {
  const vaultData = useAppStore(s => s.vaultData)
  return useMemo(() => {
    if (!vaultData) return []
    return vaultData.projects.flatMap(p =>
      p.categories.flatMap(c => c.notes.filter(n => n.favorite))
    )
  }, [vaultData])
}
