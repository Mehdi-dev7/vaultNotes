import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../main/ipc/channels'

// ─── API sécurisée exposée au renderer ────────────────────────────────────────
// NE PAS ajouter de fonctions crypto ici.
// Le renderer reçoit uniquement des primitives I/O et des événements système.

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string }

const vaultAPI = {
  // ── Fichier vault (données toujours chiffrées côté renderer avant envoi) ────
  vaultExists:   (): Promise<Result<boolean>>      => ipcRenderer.invoke(IPC.FILE_VAULT_EXISTS),
  readVault:     (): Promise<Result<string>>        => ipcRenderer.invoke(IPC.FILE_READ_VAULT),
  writeVault:    (content: string): Promise<Result> => ipcRenderer.invoke(IPC.FILE_WRITE_VAULT, content),
  getVaultPath:  (): Promise<Result<string>>        => ipcRenderer.invoke(IPC.FILE_GET_PATH),

  // ── Export / Import ────────────────────────────────────────────────────────
  showSaveDialog: (defaultName: string): Promise<Result<string | null>> => ipcRenderer.invoke(IPC.DIALOG_SAVE, defaultName),
  showOpenDialog: (): Promise<Result<string | null>>                     => ipcRenderer.invoke(IPC.DIALOG_OPEN),
  writeExport:    (filePath: string, content: string): Promise<Result>   => ipcRenderer.invoke(IPC.FILE_WRITE_EXPORT, filePath, content),
  readImport:     (filePath: string): Promise<Result<string>>             => ipcRenderer.invoke(IPC.FILE_READ_IMPORT, filePath),

  // ── Préférences non-sensibles ──────────────────────────────────────────────
  getPreference: (key: string): Promise<Result<unknown>>         => ipcRenderer.invoke(IPC.PREFS_GET, key),
  setPreference: (key: string, value: unknown): Promise<Result>  => ipcRenderer.invoke(IPC.PREFS_SET, key, value),

  // ── Événements main → renderer ─────────────────────────────────────────────
  onAutoLocked: (cb: () => void) => {
    ipcRenderer.on('vault:auto-locked', cb)
    return () => ipcRenderer.removeListener('vault:auto-locked', cb)
  },
  onMenuEvent: (event: string, cb: () => void) => {
    ipcRenderer.on(event, cb)
    return () => ipcRenderer.removeListener(event, cb)
  },

  // ── Signaux renderer → main ────────────────────────────────────────────────
  pingActivity:       ()        => ipcRenderer.send('activity:ping'),
  notifyLocked:       ()        => ipcRenderer.send('lock:manual'),
  setAutoLockDelay:   (ms: number) => ipcRenderer.send('autolock:setDelay', ms),
}

contextBridge.exposeInMainWorld('vault', vaultAPI)

export type VaultAPI = typeof vaultAPI
